FROM bigtruedata/scala:alpine

RUN apk update && apk add \
  nodejs-npm

COPY . /opt/org-structure-slack/

WORKDIR /opt/org-structure-slack

RUN cli/org 2>/dev/null || true

ENTRYPOINT [ "./run.sh" ]
