# org-structure-slack

A Slack client built on top of [org-structure-cli][org-structure-cli].

Allows you to ask questions about our organization, which are passed as commands
to a local org-structure-cli. The client is pulled in as a submodule.

Certain key pieces of data are pulled from the response and formatted as a Slack
attachment. Data fields that the bot checks for are `name`, `title` and `location`.
Any data that isn't recognised is displayed as a generic attachment field.

The bot also integrates with PagerDuty and can be used to page a team. The team's
PagerDuty service is looked up using the cli (it expects a team column called 'PagerDuty')
and the PagerDuty auth token is read from the ORG_STRUCTURE_PD_TOKEN environmant
variable.

## Usage

    who is [somebody]
    who are [some team]
    page [some team]

## Building

org-structure-slack is a chat bot built on the [Hubot][hubot] framework. It was
initially generated by [generator-hubot][generator-hubot].

## Running locally

You can start org-structure-slack locally by running:

    % ORG_STRUCTURE_DATA_DIR=[location of org structure data] ORG_STRUCTURE_CLIENT=[location of org structure cli] HUBOT_SLACK_TOKEN=[bot token] bin/hubot -a slack

or by running the `run.sh` file:

    % ORG_STRUCTURE_SLACK_TOKEN=[bot token] run.sh

Set an `ORG_STRUCTURE_PD_TOKEN` if you want to use the PagerDuty functionality.

`run.sh` expects to find the data directory and cli in `./data` and `./cli` respectively.

## Docker

org-structure-slack also comes with a Dockerfile, which builds an image using
[BigTrueData's scala alpine image][scala-alpine] as a base and runs `run.sh`.

Because the container runs `run.sh`, you only need to provide the `ORG_STRUCTURE_SLACK_TOKEN`
environment variable (and optionally `ORG_STRUCTURE_PD_TOKEN`)  when running the container.


[org-structure-cli]: https://github.com/saksdirect/org-structure-cli
[hubot]: http://hubot.github.com
[generator-hubot]: https://github.com/github/generator-hubot
[scala-alpine]:https://github.com/bigtruedata/docker-scala
