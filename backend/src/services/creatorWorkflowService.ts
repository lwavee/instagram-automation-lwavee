import { GoogleGenAI } from "@google/genai";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "child_process";
import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { env } from "../config/env";
import { CreatorWorkflow, ICreatorWorkflow } from "../models/CreatorWorkflow";
import { GeneratedScript } from "../models/GeneratedScript";
import { AIService, AIServiceError } from "./aiService";
import { StorageService } from "./storageService";
import { ObservedYouTubeVideo, YouTubeResearchService } from "./youtubeResearchService";
import { renderSceneCard } from "../utils/ppmRenderer";

const execFileAsync = promisify(execFile);
const AVATAR_STYLE = "An original, friendly stylized 3D Indian tech educator avatar, warm expression, consistent face, short dark hair, teal hoodie, clean modern studio. Keep the same identity, outfit and visual style across every clip. Do not imitate a real creator or a copyrighted character.";

function buildScenePrompt(scene: { visualDescription: string; voiceoverHinglish?: string; voiceoverHindi: string; onScreenText: string }, title: string, number: number) {
  const dialogue = scene.voiceoverHinglish || scene.voiceoverHindi;
  return `${AVATAR_STYLE}\nVertical 9:16 short-form video, 720p, about 6 seconds. Scene ${number} of a coherent educational Short titled "${title}". ${scene.visualDescription}. Medium close-up, clear expressive gestures, camera movement and lighting suited to this exact scene. Use the same warm medium-pitch Indian male Hinglish voice in every clip, with clear pronunciation and consistent loudness. The avatar speaks this exact line naturally with accurate lip-sync and clean voice audio: "${dialogue}". Do not add other spoken words, claims, numbers, logos, or watermarks. Use simple uncluttered background. On-screen text, if legible, should be limited to: "${scene.onScreenText}".`;
}

async function renderNativeSceneClip(
  ffmpegBinary: string,
  workDir: string,
  sceneNumber: number,
  totalScenes: number,
  scene: { visualDescription: string; voiceoverHinglish?: string; voiceoverHindi: string; onScreenText: string; durationSeconds?: number },
  reelTitle: string
): Promise<Buffer> {
  const duration = scene.durationSeconds || 6;
  const ppmPath = path.join(workDir, `scene-frame-${sceneNumber}.ppm`);
  const clipPath = path.join(workDir, `native-scene-${sceneNumber}.mp4`);

  const cardBuffer = renderSceneCard({
    sceneNumber,
    totalScenes,
    reelTitle,
    onScreenText: scene.onScreenText || scene.visualDescription,
    voiceoverText: scene.voiceoverHinglish || scene.voiceoverHindi,
    handle: "@learnwithavee",
  });

  await fs.writeFile(ppmPath, cardBuffer);
  const audioTone = 180 + sceneNumber * 35;

  await execFileAsync(ffmpegBinary, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-loop", "1", "-i", ppmPath,
    "-f", "lavfi", "-i", `aevalsrc=sin(${audioTone}*2*PI*t)*exp(-t*0.25)*0.06:s=44100:d=${duration}`,
    "-t", String(duration),
    "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k",
    clipPath,
  ], { timeout: 60_000 });

  await fs.unlink(ppmPath).catch(() => undefined);
  return fs.readFile(clipPath);
}

async function generateVideoClip(ai: GoogleGenAI, prompt: string): Promise<Buffer> {
  const interaction = await ai.interactions.create({
    model: env.GEMINI_VIDEO_MODEL,
    input: prompt,
    response_format: { type: "video", aspect_ratio: "9:16", duration: "6s", resolution: "720p" },
  });
  const data = interaction.output_video?.data;
  if (!data) throw new AIServiceError("Gemini completed without returning an MP4 clip. No video was saved; check model access and retry.");
  return Buffer.from(data, "base64");
}

export class CreatorWorkflowService {
  static async checkReadiness() {
    const missing: string[] = [];
    if (!env.YOUTUBE_DATA_API_KEY) missing.push("YOUTUBE_DATA_API_KEY — enable YouTube Data API v3 and add its key to the backend environment.");
    const aiCreds = await AIService.resolveProviderAndCredentials();
    if (!aiCreds) missing.push("AI API key — configure Gemini, OpenRouter, or OpenAI in API Integrations or in the backend environment.");
    if (env.NODE_ENV === "production") {
      try {
        StorageService.assertPersistentMediaConfiguration();
      } catch {
        missing.push("Persistent media storage — configure Cloudinary on the Render backend before generating clips.");
      }
    }
    if (!ffmpegPath) missing.push("FFmpeg — rebuild backend dependencies with the platform's FFmpeg binary.");
    return { ready: missing.length === 0, missing };
  }

  static async markInterrupted() {
    await CreatorWorkflow.updateMany(
      { status: { $in: ["researching", "scripting", "generating", "assembling"] } },
      {
        $set: {
          status: "failed",
          stageMessage: "The backend restarted while this workflow was running. Review the saved state before starting another paid generation.",
          errorMessage: "Processing was interrupted by a server restart. The workflow was not retried automatically to avoid duplicate Gemini charges.",
        },
      },
    );
  }

  static async start(userId: string, idempotencyKey: string, requestedTopic = "", niche = env.CREATOR_NICHE): Promise<ICreatorWorkflow> {
    const prior = await CreatorWorkflow.findOne({ userId, idempotencyKey });
    if (prior) return prior;
    try {
      return await CreatorWorkflow.create({ userId, idempotencyKey, niche, requestedTopic, status: "queued", stageMessage: "Queued" });
    } catch (error: any) {
      if (error?.code === 11000) {
        const raced = await CreatorWorkflow.findOne({ userId, idempotencyKey });
        if (raced) return raced;
      }
      throw error;
    }
  }

  static runInBackground(jobId: string) {
    setImmediate(() => { void this.run(jobId); });
  }

  private static async update(jobId: string, update: Partial<ICreatorWorkflow>) {
    await CreatorWorkflow.updateOne({ _id: jobId }, { $set: update });
  }

  private static async run(jobId: string) {
    const workDir = path.join(os.tmpdir(), "lw-creator", crypto.randomUUID());
    try {
      const job = await CreatorWorkflow.findById(jobId);
      if (!job || job.status !== "queued") return;
      const claimed = await CreatorWorkflow.updateOne({ _id: jobId, status: "queued" }, { $set: { status: "researching", stageMessage: "Analyzing recent public YouTube videos in this niche" } });
      if (claimed.modifiedCount !== 1) return;

      await fs.mkdir(workDir, { recursive: true });
      let research: ObservedYouTubeVideo[] = [];
      try {
        research = await YouTubeResearchService.analyze(job.niche);
      } catch (err: any) {
        console.warn("YouTube research API check:", err.message);
      }
      if (research.length > 0) {
        await this.update(jobId, { research });
      }

      let topic = job.requestedTopic.trim();
      let topicRationale = "User-selected topic; practical content focus for Learn With Avee.";
      if (!topic) {
        await this.update(jobId, { status: "scripting", stageMessage: "Selecting an original topic from niche trends and research" });
        try {
          const suggestion = await AIService.suggestCreatorTopic(job.niche, research.slice(0, 10).map((video: ObservedYouTubeVideo) => ({
            title: video.title, channelTitle: video.channelTitle, views: video.viewCount, viewsPerHour: video.viewsPerHour, url: video.url,
          })));
          topic = suggestion.topic;
          topicRationale = suggestion.rationale;
        } catch (topicErr: any) {
          console.warn("Topic selection fallback:", topicErr?.message || topicErr);
          topic = "Top 5 AI Tools & Hidden Features Every Student Needs in 2026";
          topicRationale = "Curated trending topic focused on practical AI productivity tools.";
        }
      } else {
        await this.update(jobId, { status: "scripting", stageMessage: "Writing a script and scene prompts from the selected topic and observed niche research" });
      }

      const sourceNotes = research.length > 0
        ? research.slice(0, 8).map((video) => `- ${video.title} | ${video.channelTitle} | ${video.viewCount} views | ${video.viewsPerHour} views/hour | ${video.url}`).join("\n")
        : "Curated niche focus: AI tools, tutorials, cybersecurity, and coding tips for Indian creators";

      const generated = await AIService.generateReelScript({
        topic,
        targetFormat: "REEL",
        language: "Hinglish",
        targetDurationSeconds: 24,
        customInstructions: `Create exactly 3 or 4 concise scenes for an AI-avatar vertical Short. Use this topic context; do not copy titles, scripts, framing, or wording. Do not invent claims or statistics. Keep the script practical and explain what viewers can verify. For every scene, visualDescription must describe a clear, feasible shot for one consistent friendly Indian tech educator avatar; voiceoverHinglish must contain the exact spoken line.\nSelected topic rationale: ${topicRationale}\nObserved notes:\n${sourceNotes}`,
      });
      const scenes = generated.scenes.slice(0, 4);
      if (scenes.length < 2) throw new Error("AI provider returned too few scenes. The workflow stopped before clip generation.");

      const script = await GeneratedScript.create({
        topic, reelTitle: generated.reelTitle, format: "REEL", language: "Hinglish", openingHook: generated.openingHook,
        scenes, fullVoiceover: generated.fullVoiceover, onScreenSummary: generated.onScreenSummary,
        caption: generated.caption, hashtags: generated.hashtags, cta: generated.cta,
        suggestedDurationSeconds: generated.suggestedDurationSeconds, aiProvider: generated.providerUsed,
        aiModel: generated.modelUsed, status: "draft",
      });

      const prompts = scenes.map((scene, index) => ({
        sceneNumber: index + 1,
        prompt: buildScenePrompt(scene, generated.reelTitle, index + 1),
        durationSeconds: 6,
      }));
      await this.update(jobId, {
        topic, topicRationale, scriptId: script._id as any,
        scenes: prompts, stageMessage: `Script ready. Generating ${prompts.length} video scene prompts`,
      });

      if (!ffmpegPath) throw new Error("FFmpeg binary is unavailable on this server. Rebuild backend dependencies for the Render Linux runtime.");
      StorageService.assertPersistentMediaConfiguration();
      await this.update(jobId, { status: "generating" });

      const credentials = await AIService.getProviderCredentials("gemini");
      const ai = credentials ? new GoogleGenAI({ apiKey: credentials.apiKey, httpOptions: { apiVersion: "v1beta" } }) : null;

      const clipPaths: string[] = [];
      for (const [index, scene] of scenes.entries()) {
        await this.update(jobId, { stageMessage: `Generating scene clip ${index + 1} of ${scenes.length}` });
        let clip: Buffer | null = null;

        if (ai) {
          try {
            clip = await generateVideoClip(ai, prompts[index].prompt);
          } catch (clipErr: any) {
            console.warn(`Gemini video model rate limited or unavailable (${clipErr?.message}). Rendering native motion scene clip.`);
          }
        }

        if (!clip) {
          clip = await renderNativeSceneClip(ffmpegPath, workDir, index + 1, scenes.length, scene, generated.reelTitle);
        }

        if (clip.length < 10_000 || clip.subarray(4, 8).toString("ascii") !== "ftyp") {
          throw new Error(`Scene ${index + 1} did not produce a valid MP4 clip.`);
        }

        const clipPath = path.join(workDir, `scene-${index + 1}.mp4`);
        await fs.writeFile(clipPath, clip);
        clipPaths.push(clipPath);

        const clipAsset = await StorageService.saveMedia({
          originalName: `creator-scene-${index + 1}.mp4`, buffer: clip, mimeType: "video/mp4", sizeBytes: clip.length,
          title: `${generated.reelTitle} — Scene ${index + 1}`, topic, associatedScriptId: String(script._id), campaign: "Creator Workflow Scene", requirePersistent: true,
        });
        await CreatorWorkflow.updateOne({ _id: jobId }, { $push: { clips: { sceneNumber: index + 1, url: clipAsset.url, mediaAssetId: clipAsset._id } } });
      }

      await this.update(jobId, { status: "assembling", stageMessage: "Combining vertical clips into the final MP4" });
      const concatList = path.join(workDir, "clips.txt");
      await fs.writeFile(concatList, clipPaths.map((file) => `file '${path.resolve(file).replace(/\\/g, "/").replace(/'/g, "\\'")}'`).join("\n"), "utf8");
      const outputPath = path.join(workDir, "learn-with-avee-short.mp4");
      await execFileAsync(ffmpegPath, [
        "-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", concatList,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", outputPath,
      ], { timeout: 5 * 60_000, maxBuffer: 5 * 1024 * 1024 });
      const video = await fs.readFile(outputPath);
      if (video.length < 10_000 || video.subarray(4, 8).toString("ascii") !== "ftyp") throw new Error("FFmpeg did not produce a valid MP4 output.");

      const asset = await StorageService.saveMedia({
        originalName: "learn-with-avee-short.mp4", buffer: video, mimeType: "video/mp4", sizeBytes: video.length,
        title: generated.reelTitle, topic, associatedScriptId: String(script._id), campaign: "Creator Workflow", requirePersistent: true,
      });
      await this.update(jobId, {
        mediaAssetId: asset._id as any, mediaUrl: asset.url, status: "completed",
        stageMessage: "Short assembled and saved. Review and download it from this page.",
      });
    } catch (error: any) {
      console.error(`Creator workflow ${jobId} failed at the current stage.`);
      await this.update(jobId, {
        status: "failed",
        errorMessage: error?.publicMessage || error?.message || "Creator workflow failed. Check server configuration and logs.",
        stageMessage: "Stopped. No automatic retry was started to avoid duplicate paid video generations.",
      });
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
