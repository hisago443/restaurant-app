#!/bin/bash
export ANDROID_HOME=/nix/store/9wkh370j1qq1vjs40b2fy7cbfvbqgdpc-androidsdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/tools/bin:/nix/store/lwnnk53cz0y09zg39c3gk23bjgjih6d1-android-sdk-platform-tools-36.0.0/bin
/nix/store/9wkh370j1qq1vjs40b2fy7cbfvbqgdpc-androidsdk/bin/emulator -avd my_emulator -no-snapshot > /dev/null 2>&1 &
/nix/store/lwnnk53cz0y09zg39c3gk23bjgjih6d1-android-sdk-platform-tools-36.0.0/bin/adb wait-for-device
cd AwesomeProjectMobile && npx expo start --android
