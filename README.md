# Node.js Script to handle voicemails from Asterisk


use this node script instead of the normal notification from Asterisk

in your voicemail.conf file find the option 

```
externnotify = <PATH TO voicemail_script.js>
```

update the constants at the top of the voicemail_script.js file


##Dependencies

 * node
 * node module `nodemailer` 
 * node module `handlebars`
 * LAME in your path
 
## License

This script is available as open source under the terms of the [MIT License](http://opensource.org/licenses/MIT).

