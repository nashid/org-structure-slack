module.exports = (robot) ->

  robot.respond /(.*)/i, (res) ->

    # Replace the Slack curly quotes!
    command = res.match[1].replace(/[\u2018\u2019]/g, '\\\'')

    # Log for usage data
    console.log 'Command: ' + command

    if not command.startsWith('get') and not command.startsWith('find') and not command.startsWith('member') and not command.startsWith('team') and not command.startsWith('title') and not command.startsWith('help')
      res.send "Look up information about our Org Structure! Type `help` to get started."
    else
      execCmd = require('child_process').exec
      orgDataDir = process.env.ORG_STRUCTURE_DATA_DIR
      cli = process.env.ORG_STRUCTURE_CLIENT

      fullCmd = 'ORG_DATA_DIR=' + orgDataDir + ' ' + cli + ' ' + command
 
      execCmd fullCmd, (error, stdout, stderr) ->
        if stdout and command.startsWith('get')
          # Only one result will be returned for 'get' so the response is an object rather than an array
          result = JSON.parse(stdout)
          keys = Object.keys(result).sort()
          output = ''
          for key in keys
            output = output + key + ': ' + result[key] + '\n'
          res.send output
        else if stdout
          results = JSON.parse(stdout)
          output = ''
          for result in results
            keys = Object.keys(result).sort()
            output = output + '\n'
            for key in keys
              output = output + key + ': ' + result[key] + '\n'
          res.send output
        else
          res.send (stdout || stderr)
