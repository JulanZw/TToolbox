# Changelog for the ttoolbox framework

## V1.0.0

- Release

## V1.0.2

- Adjusted github links
- Added email

## V1.0.3

- small readme change

## V1.0.4

- Made the logFilePath protected instead of private
- Made the rotate function in the logger mutate the path instead of returning a new instance

## V1.1.0

- Added a changelog
- Added an error reporter

## V1.2.0 - ComponentManager

- Added a ComponentManager and its types

## V1.3.0 - AutocompleteManager

- Added an AutocompleteManager and its types

## V1.4.0 - life cycle hooks

- Added hooks:
  - beforeExecute
  - afterExecute
  - onError

to Command and SubcommandGroup

- Removed safeExecute in the SubcommandGroup as it was redundant

## V1.5.0 - User and Message context menu commands

- Added MessageContextMenuCommand
- Added UserContextMenuCommand
- Adjusted the CommandManager to accomodate the new command types
  - Deprecated `register()` and `registerMultiple()` in favor of the new `registerCommand()` function
  - Renamed `toDiscordJson()` > `toJson()`
  - Updated getters, setters and other small helper methods
  - Added experimental autoloader function
- Added the new commands as exports
- Added experimental autoloader
