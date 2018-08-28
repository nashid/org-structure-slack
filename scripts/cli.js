module.exports = function(robot) {

  function isValidCommand(command) {
    return command.startsWith('page') || command.startsWith('get') || command.startsWith('find') || command.startsWith('member') || command.startsWith('team') || command.startsWith('title') || command.startsWith('help');
  }

  function parseGetResponse(responseItem) {
    // Only one result will be returned for 'get' so the response is an object rather than an array
    var keys = Object.keys(responseItem).sort(),
        key,
        result = '';
    for (var keyIndex in keys) {
      key = keys[keyIndex];
      result = result + key + ': ' + responseItem[key] + '\n';
    }
    return result;
  }

  function parseListResponse(responseList) {
    var responseItem,
        keys,
        key,
        result = '';

    for (var index in responseList) {
      responseItem = responseList[index];
      keys = Object.keys(responseItem).sort();
      result = result + '\n';
      for (var keyIndex in keys) {
        key = keys[keyIndex];
        result = result + key + ': ' + responseItem[key] + '\n';
      }
    }
    return result;
  }

  function buildCliCommand(userCommand) {
    var orgDataDir = process.env.ORG_STRUCTURE_DATA_DIR,
        cli = process.env.ORG_STRUCTURE_CLIENT,
        commandBits,
        command;

    if (userCommand.startsWith('page')) {
      commandBits = userCommand.split(" ");
      command = 'ORG_DATA_DIR=' + orgDataDir + ' ' + cli + ' get team ' + commandBits[1];
    } else {
      command = 'ORG_DATA_DIR=' + orgDataDir + ' ' + cli + ' ' + userCommand;
    }
    return command;
  }

  function createIncident(service, description, from, onSuccess) {
    var data = JSON.stringify({
                 "incident": {
                   "type": "incident",
                   "title": description,
                   "service": {
                     "id": service,
                     "type": "service_reference"
                   }
                 }
               }),
        pdToken = 'Token token=' + process.env.ORG_STRUCTURE_PD_TOKEN;

    robot.http("https://api.pagerduty.com")
      .path('incidents')
      .header('Authorization', pdToken)
      .header('Accept', 'application/vnd.pagerduty+json;version=2')
      .header('Content-Type', 'application/json')
      .header('From', from)
      .post(data)(function(err, resp, body) {
        if (err) {
          console.log("Error trying to create incident: " + err);
        } else if (resp && resp.statusCode != 200) {
          console.log("Error trying to create incident. Response code: " + resp.statusCode + "; Response body: " + body);
        } else {
          onSuccess(JSON.parse(body));
        }
      });
  }

  function createIncidentDescription(res) {
    return res.message.user.real_name + " is looking for your urgently in Slack channel #" + res.message.rawMessage.channel.name;
  }

  robot.respond(/(.*)/i, function(res) {

    // Replace the Slack curly quotes!
    var command = res.match[1].replace(/[\u2018\u2019]/g, '\\\'');

    // Log for usage data
    console.log('Command: ' + command);

    if (!isValidCommand(command)) {
      res.send("Look up information about our Org Structure! Type `help` to get started.");
    } else {
      var execCmd = require('child_process').exec,
          fullCmd = buildCliCommand(command);

      execCmd(fullCmd, function(error, stdout, stderr) {
        if (stdout) {
          if (command.startsWith('get')) {
            var output = parseGetResponse(JSON.parse(stdout));
            res.send(output);
          } else if (command.startsWith('page')) {
            var pdService = JSON.parse(stdout).PagerDuty;
            if (pdService && pdService.length > 0) {
              createIncident(pdService, createIncidentDescription(res), res.message.user.profile.email, function(result) {
                res.send("Incident " + result.incident.html_url + " created");
              });
            } else {
              res.send("Sorry! I don't know the PagerDuty service for this team. Is it set up in `https://github.com/saksdirect/org-structure/blob/master/teams.csv`?");
            }
          } else {
            var output = parseListResponse(JSON.parse(stdout));
            res.send(output);
          }
        } else {
          res.send(stdout || stderr);
        }
      });
    }
  });
};
