const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// AppCheckCore (pulled in by GoogleSignIn) is a Swift pod that requires
// GoogleUtilities and RecaptchaInterop to expose modules when building
// as static libraries. Without this, pod install fails with:
// "The Swift pod AppCheckCore depends upon GoogleUtilities and RecaptchaInterop,
//  which do not define modules."
module.exports = (config) =>
  withDangerousMod(config, [
    'ios',
    (c) => {
      const podfilePath = path.join(c.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      const injection = [
        "  pod 'GoogleUtilities', :modular_headers => true",
        "  pod 'RecaptchaInterop', :modular_headers => true",
      ].join('\n');

      if (!contents.includes("pod 'GoogleUtilities', :modular_headers => true")) {
        contents = contents.replace('use_expo_modules!', `use_expo_modules!\n${injection}`);
        fs.writeFileSync(podfilePath, contents);
      }

      return c;
    },
  ]);
