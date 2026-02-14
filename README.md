# RegexMessageTag

As the name suggests, this extension provides a means to tag messages based on a regular expression (regex) match of their subject lines. All messages that have the same regex match will get the same tag. Tags are of the form SNx, which x is one or more digits. Each time you run the tagger, all previous tags of the form SNx will be deleted and new ones created. Your other tags, such as "Important" or "Later" will be unaffected. 

## What is this for?

I wanted to be able to group messages based on a string within the subject line. Sorting won't do it if the rest of the line interferes. By adding tags based on regex matches I can sort the tags and have the messages grouped together. 

## Example
Let's say you have messages with subject lines
1. Topic 12345
2. Response to 12345
3. Msg 34568435
4. Msg 88734
5. Msg 12345

If you use regex `(\s\d+)$` (match any string starting with  space and followed by any number of consecutive digits ending the subject line) then every msg will be tagged. Msgs 1, 2, and 5 will get SN1, msg 3 will get SN2, and msg 4 will get SN3.

If you use regex `(Msg)`, then msgs 3,4,and 5 will all get SN1 and the others won't be tagged.

Thunderbird extensions are written in Javascript, so the regex must use Javascript regex notation.

There are a variety of websites to help you write and test your regex. I like [regex101.com](https://regex101.com)

## Usage
The regex is set in the options screen of the extension. Go to Tools->Addons and Themes. Then click the wrench icon next to Regex Message Tagger in the list of extensions. The options screen will appear and you can enter your regex. Once you save this, it is persistently saved to storage in the Thunderbird app. If you close the app and reopen, the last saved regex will be restored.

To tag your messages, either right-click->Regex Message Tagger->Tag Messages, or use the shortcut key ctrl-alt-T.
To remove the tags, either right-click->Regex Message Tagger-> Delete SN Tags, or use the shortcut key ctrl-alt-U.

If the Tags column is not visible in the messages pane, right-click on any heading and tick the Tags entry. 

If you don't like the default shortcut keys, you can change them. Go to Tools->Addons and Themes. Click on the gear (upper right corner), then select Manage Extension Shortcuts (last entry when this was written). A window will open that will let you set your own shortcuts.