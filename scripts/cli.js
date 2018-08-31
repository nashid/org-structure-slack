module.exports = function(robot) {

var usage = "Usage:\n\twho is [somebody]\n\twho are [some team]\n\tpage [some team]\n";

robot.respond(/(.*)/i, function(res) {

  var startTime = new Date().getTime(),
      requestId = startTime, // Yeah, yeah. Whatever.
      command = res.match[1].replace(/[\u2018\u2019]/g, '\\\''); // Replace the Slack curly quotes!
      attachmentColors = ['#0F9566', '#D11D35', '#F3C021', '#0D1682'];

  console.log('Received command: ' + command + ' (Request id: ' + requestId);

  function sendResponse(response) {
    res.send(response);
    console.log('Completed request ' + requestId + ' in ' + (new Date().getTime()-startTime) + 'ms');
  }

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

  function runCommand(command, onSuccess) {
    var execCmd = require('child_process').exec;

    execCmd(command, function(error, stdout, stderr) {
      if (stdout) {
        onSuccess(JSON.parse(stdout));
      } else {
        sendResponse(stdout || stderr);
      }
    });
  }

  function createAttachments(items) {
    var attachments = [], color;

    for (var index in items) {
      color = attachmentColors[index % attachmentColors.length];
      attachments.push(createAttachment(items[index], color));
    }
    return attachments;
  }

  function createAttachment(item, color) {
    var keys = Object.keys(item).sort(),
        attachment = {},
        fields = [],
        field, key, value,
        name, title, primaryLocation, secondaryLocation,
        attachmentText = [], location = [];

    for (var keyIndex in keys) {
      key = keys[keyIndex];
      value = item[key];
      if (value.length > 0) {
        switch (key.toUpperCase()) {
          case 'NAME':
            name = value;
            break;
          case 'TITLE':
            title = value;
            break;
          case 'PRIMARY LOCATION':
            primaryLocation = value;
            break;
          case 'SECONDARY LOCATION':
            secondaryLocation = value;
            break;
          case 'GROUP':
            // Ignore group for now. It doesn't add much value.
            break;
          default:
            field = {}
            field.title = key;
            field.value = item[key];
            field.short = true;
            fields.push(field);
        }
      }
    }

    attachment.fields = fields;
    attachment.color = color ? color : attachmentColors[0];

    if (name) attachment.title = name;
    if (title) attachmentText.push(title);
    if (primaryLocation) location.push(primaryLocation);
    if (secondaryLocation) location.push('(' + secondaryLocation + ')');
    if (location.length > 0) attachmentText.push(location.join(' '));
    if (attachmentText.length > 0) attachment.text = attachmentText.join(', ');

    return attachment;
  }

  function createIncident(service, description, from) {
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
          sendResponse("Error trying to create incident. Please see logs for more details.");
          console.log("Error trying to create incident: " + err);
        } else if (resp && resp.statusCode != 201) {
          sendResponse("Error trying to create incident. Please see logs for more details.");
          console.log("Error trying to create incident. Response code: " + resp.statusCode + "; Response body: " + body);
        } else {
          sendResponse("Incident " + JSON.parse(body).incident.html_url + " created");
        }
      });
  }

  function isFirstOccuranceOfMember(member, indexToCheck, self) {
    // Check if this is the first occurance of the member
    return self.findIndex(e => e.Name === member.Name) === indexToCheck;
  }

  function whoIsCommand(userCommand) {
    var searchTerms = userCommand.split(' ');
    searchTerms.splice(0, 2);

    // Search by name
    var command = buildCliCommand(['find', 'members', 'name'].concat(searchTerms).join(' '));
    runCommand(command, function(nameResult) {
      // Now search by github handle
      command = buildCliCommand(['find', 'members', 'github'].concat(searchTerms).join(' '));
      runCommand(command, function(githubResult) {
        // Now search by email
        command = buildCliCommand(['find', 'members', 'email'].concat(searchTerms).join(' '));
        runCommand(command, function(emailResult) {
          var result = nameResult.concat(githubResult).concat(emailResult).filter(isFirstOccuranceOfMember);
          sendResponse({ "attachments": createAttachments(result) });
        });
      });
    });
  }

  function whoAreCommand(userCommand) {
    var searchTerms = userCommand.split(' ');
    searchTerms.splice(0, 2);

    // Search by name
    var command = buildCliCommand(['get', 'team'].concat(searchTerms).join(' '));
    runCommand(command, function(nameResult) {
      sendResponse({ "attachments": [ createAttachment(nameResult) ] });
    });
  }

  function pageCommand(userCommand) {
    var searchTerms = userCommand.split(' '),
        pdService, description;

    searchTerms.splice(0, 1);

    var command = buildCliCommand(['get', 'team'].concat(searchTerms).join(' '));
    // Get the team's PD service
    runCommand(command, function(team) {
      pdService = team.PagerDuty;
      if (pdService && pdService.length > 0) {
        description = res.message.user.real_name + " is looking for you urgently in Slack channel #" + res.message.rawMessage.channel.name;
        createIncident(pdService, description, res.message.user.profile.email);
      } else {
        sendResponse("Sorry! I don't know the PagerDuty service for this team. Is it set up in `https://github.com/saksdirect/org-structure/blob/master/teams.csv`?");
      }
    });
  }


  if (!isValidCommand(command)) {
    sendResponse(usage);
  } else if (command.startsWith('page')) {
    pageCommand(command);
  } else if (command.startsWith('who is')) {
    whoIsCommand(command);
  } else if (command.startsWith('who are')) {
    whoAreCommand(command);
  }
});
};
