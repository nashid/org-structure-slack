module.exports = function(robot) {

  var usage = "Usage:\n\twho is [somebody]\n\twho are [some team]\n\tpage [some team]\n";

  function isValidCommand(command) {
    var commandBits = command.split(' ');

    if (command.startsWith('page')) {
      return commandBits.length === 2;
    } else if (command.startsWith('who is')) {
      return commandBits.length >= 3;
    } else if (command.startsWith('who are')) {
      return commandBits.length >= 3;
    } else {
      return false;
    };
  }

  function buildCliCommand(command) {
    var orgDataDir = process.env.ORG_STRUCTURE_DATA_DIR,
        cli = process.env.ORG_STRUCTURE_CLIENT;

    return 'ORG_DATA_DIR=' + orgDataDir + ' ' + cli + ' ' + command;
  }

  function runCommand(res, command, onSuccess) {
    var execCmd = require('child_process').exec;

    execCmd(command, function(error, stdout, stderr) {
      if (stdout) {
        onSuccess(JSON.parse(stdout));
      } else {
        res.send(stdout || stderr);
      }
    });
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

  function createIncidentDescription(res) {
    return res.message.user.real_name + " is looking for your urgently in Slack channel #" + res.message.rawMessage.channel.name;
  }

  function createIncident(res, service, description, from) {
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
          res.send("Error trying to create incident. Please see logs for more details.");
          console.log("Error trying to create incident: " + err);
        } else if (resp && resp.statusCode != 200) {
          res.send("Error trying to create incident. Please see logs for more details.");
          console.log("Error trying to create incident. Response code: " + resp.statusCode + "; Response body: " + body);
        } else {
          res.send("Incident " + JSON.parse(result).incident.html_url + " created");
        }
      });
  }

  function isFirstOccuranceOfMember(member, indexToCheck, self) {
    // Check if this is the first occurance of the member
    return self.findIndex(e => e.Name === member.Name) === indexToCheck;
  }

  function whoIsCommand(res, userCommand) {
    var searchTerms = userCommand.split(' ');
    searchTerms.splice(0, 2);

    // Search by name
    var command = buildCliCommand(['find', 'members', 'name'].concat(searchTerms).join(' '));
    runCommand(res, command, function(nameResult) {
      // Now search by github handle
      command = buildCliCommand(['find', 'members', 'github'].concat(searchTerms).join(' '));
      runCommand(res, command, function(githubResult) {
        // Now search by email
        command = buildCliCommand(['find', 'members', 'email'].concat(searchTerms).join(' '));
        runCommand(res, command, function(emailResult) {
          var result = nameResult.concat(githubResult).concat(emailResult).filter(isFirstOccuranceOfMember);
          res.send(parseListResponse(result));
        });
      });
    });
  }

  function whoAreCommand(res, userCommand) {
    var searchTerms = userCommand.split(' ');
    searchTerms.splice(0, 2);

    // Search by name
    var command = buildCliCommand(['get', 'team'].concat(searchTerms).join(' '));
    runCommand(res, command, function(nameResult) {
      res.send(parseGetResponse(nameResult));
    });
  }

  function pageCommand(res, userCommand) {
    var searchTerms = userCommand.split(' ');
    searchTerms.splice(0, 1);

    var command = buildCliCommand(['get', 'team'].concat(searchTerms).join(' '));
    // Get the team's PD service
    runCommand(res, command, function(team) {
      var pdService = team.PagerDuty;
      if (pdService && pdService.length > 0) {
        createIncident(res, pdService, createIncidentDescription(res), res.message.user.profile.email);
      } else {
        res.send("Sorry! I don't know the PagerDuty service for this team. Is it set up in `https://github.com/saksdirect/org-structure/blob/master/teams.csv`?");
      }
    });
  }

  robot.respond(/(.*)/i, function(res) {

    // Replace the Slack curly quotes!
    var command = res.match[1].replace(/[\u2018\u2019]/g, '\\\'');

    // Log for usage data
    console.log('Command: ' + command);

    if (!isValidCommand(command)) {
      res.send(usage);
    } else if (command.startsWith('page')) {
      pageCommand(res, command);
    } else if (command.startsWith('who is')) {
      whoIsCommand(res, command);
    } else if (command.startsWith('who are')) {
      whoAreCommand(res, command);
    }
  });
};
