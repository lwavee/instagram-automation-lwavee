FROM docker.n8n.io/n8nio/n8n:latest

USER root
# Ensure node user owns working directory if needed
RUN chown -R node:node /home/node

USER node
WORKDIR /home/node

EXPOSE 5678

CMD ["n8n", "start"]

