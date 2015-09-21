#!/usr/bin/node
/*
copyright 2015 Jason Westbrook <jwestbrook@gmail.com>

version 0.0.1

https://github.com/jwestbrook/asterisk_voicemail_script

released under MIT license

*/
var nodemailer = require("/usr/lib/node_modules/nodemailer");
var Handlebars = require("/usr/lib/node_modules/handlebars");
var exec = require('child_process').exec;
var fs = require('fs');

/*
Fill in these constants
*/
var emailuser = "";
var emailpassword = "";
var email_from = "\"Asterisk PBX\" <asterisk@domain.com>";
var emailtemplate_location = "";
var asterisk_voicemail_conf = "/etc/asterisk/voicemail.conf";
var asterisk_voicemail_dir = "/var/spool/asterisk/voicemail/default/";

function toPaddedString(number, length, radix)
{
        var string = number.toString(radix || 10),
        slength = string.length;
        for (var i=0; i<(length - slength); i++) string = '0' + string;
        return string;
}

var smtp_options =      {
                                service : "Gmail",
                                auth : {
                                        user: emailuser,
                                        pass: emailpassword
                                }
                        };

var transport = nodemailer.createTransport("SMTP",smtp_options);

/*
 *arguments
 * context
 * extension
 * new voicemails
 * old voicemails
 * urgent voicemails
 *
 * */

var voicemaildata = {};
var source = fs.readFileSync(emailtemplate_location,{encoding:'utf8'});
var template = Handlebars.compile(source);

var exten = process.argv[3];
var newvm = process.argv[4] - 1;
var newvm_pad = toPaddedString(newvm,4);

var vmconfig = fs.readFileSync(asterisk_voicemail_conf,{encoding:'utf8'})
var linematch = new RegExp('^'+exten+" => .+$",'m');
var line = vmconfig.match(linematch);
var record = line[0].split(',');
if(record.length < 2)
{
        console.log('No Email in voicemail record, abort');
        process.exit(0);
}
voicemaildata.toname = record[1];


if(!fs.existsSync(asterisk_voicemail_dir+exten+'/INBOX/msg'+newvm_pad+'.txt') || !fs.existsSync(asterisk_voicemail_dir+exten+'/INBOX/msg'+newvm_pad+'.wav'))
{
        console.log("Voicemail metadata or wav file missing, aborting");
        process.exit(0);
}
var messagedata = fs.readFileSync(asterisk_voicemail_dir+exten+'/INBOX/msg'+newvm_pad+'.txt',{encoding:'utf8'});

exec('lame --silent '+asterisk_voicemail_dir+exten+'/INBOX/msg'+newvm_pad+'.wav /tmp/'+exten+'_'+newvm_pad+'.mp3',function(error,stdout,stderr){
        var numberonly = messagedata.match(/^callerid=[0-9]{3,10}$/m);
        var fullcallerid = messagedata.match(/^callerid="(.+)" \<([0-9]{3,10})\>$/m);
        if(numberonly)
        {
                voicemail.phone = numberonly[0].split('=')[1];
        }
        else if(fullcallerid)
        {
                voicemaildata.fromname = fullcallerid[1];
                voicemaildata.phone = fullcallerid[2];
        }
        voicemaildata.phoneformat = "("+voicemaildata.phone.substr(0,3)+") "+voicemaildata.phone.substr(3,3)+"-"+voicemaildata.phone.substr(6,4);
        voicemaildata.phone = voicemaildata.phone.substr(0,3)+'-'+voicemaildata.phone.substr(3,3)+'-'+voicemaildata.phone.substr(6,4);
        voicemaildata.duration = messagedata.match(/^duration=[0-9]+$/m)[0].split('=')[1];
        voicemaildata.fulldate = new Date(messagedata.match(/^origtime=[0-9]+$/m)[0].split('=')[1] * 1000);

        voicemaildata.fulltime = voicemaildata.fulldate.toTimeString();
        voicemaildata.fulldate = voicemaildata.fulldate.toLocaleDateString();

        if(voicemaildata.duration < 60)
        {
                voicemaildata.duration = "0:"+toPaddedString(voicemaildata.duration,2);
        }
        else
        {
                voicemaildata.duration = Math.ceil(voicemaildata.duration / 60)+' minute';
        }

        var htmlmessage = template(voicemaildata);

        var mail =      {
                                from                    : email_from,
                                to                      : "\""+record[1]+"\" <"+record[2]+">",
                                subject                 : "New Voicemail from "+(voicemaildata.fromname ? voicemaildata.fromname : voicemaildata.phoneformat),
                                generateTextFromHTML    : true,
                                html                    : htmlmessage,
                                attachments             : [{fileName : 'voicemail_'+exten+'_'+newvm_pad+'.mp3',filePath : '/tmp/'+exten+'_'+newvm_pad+'.mp3'}]
                        }

        transport.sendMail(mail,function(){
                fs.unlinkSync('/tmp/'+exten+'_'+newvm_pad+'.mp3');
                process.exit(0)
        });

});
