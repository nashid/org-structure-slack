module.exports = function(robot) {

  function isValidCommand(command) {
    return command.startsWith('get') || command.startsWith('find') || command.startsWith('member') || command.startsWith('team') || command.startsWith('title') || command.startsWith('help');
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

  robot.respond(/(.*)/i, function(res) {

    // Replace the Slack curly quotes!
    var command = res.match[1].replace(/[\u2018\u2019]/g, '\\\'');

    // Log for usage data
    console.log('Command: ' + command);

    if (!isValidCommand(command)) {
      res.send("Look up information about our Org Structure! Type `help` to get started.");
    } else {
      var execCmd = require('child_process').exec,
          orgDataDir = process.env.ORG_STRUCTURE_DATA_DIR,
          cli = process.env.ORG_STRUCTURE_CLIENT,
          fullCmd = 'ORG_DATA_DIR=' + orgDataDir + ' ' + cli + ' ' + command;
 
      execCmd(fullCmd, function(error, stdout, stderr) {
        if (stdout && command.startsWith('get')) {
          var output = parseGetResponse(JSON.parse(stdout));
          res.send(output);
        } else if (stdout) {
          var output = parseListResponse(JSON.parse(stdout));
          res.send(output);
        } else {
          res.send(stdout || stderr);
        }
      });
    }
  });
};
