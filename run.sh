#!/bin/sh

if [[ -z $ORG_STRUCTURE_SLACK_TOKEN ]]; then
  echo "ORG_STRUCTURE_SLACK_TOKEN environment variable must be set to your bot's token."
  exit 1
fi

bin/set_host

ORG_STRUCTURE_DATA_DIR=data ORG_STRUCTURE_CLIENT=cli/org HUBOT_SLACK_TOKEN=$ORG_STRUCTURE_SLACK_TOKEN bin/hubot -a slack
