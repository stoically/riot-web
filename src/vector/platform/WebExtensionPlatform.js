// @flow

/*
Copyright 2020 New Vector

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import WebPlatform from "./WebPlatform";
import UAParser from 'ua-parser-js';
import { _t } from 'matrix-react-sdk/src/languageHandler';

export default class WebExtensionPlatform extends WebPlatform {
    constructor() {
        super();
    }

    _getVersion(): Promise<string> {
        return browser.runtime.sendMessage({ method: "version" });
    }

    installUpdate() {
        browser.runtime.sendMessage({ method: "installUpdate" });
    }

    getConfig(): Promise<{}> {
        return browser.runtime.sendMessage({ method: "config" });
    }

    getHumanReadableName(): string {
        return 'WebExtension Platform'; // no translation required: only used for analytics
    }

    getDefaultDeviceDisplayName(): string {
        const ua = new UAParser();
        const appName = "Riot WebExtension"
        const browserName = ua.getBrowser().name || "unknown browser";
        const osName = ua.getOS().name || "unknown os";
        return _t('%(appName)s via %(browserName)s on %(osName)s', {
            appName: appName, browserName: browserName, osName: osName
        });
    }

    ssoLoginButtonHook(url, homeserverUrl) {
        return async () => {
            const responsePattern = `${homeserverUrl}/*`;
            const granted = await browser.permissions.request({
                permissions: ["webRequest"],
                origins: [responsePattern]
            });
            if (!granted) {
                console.log("WebExtension: permissions denied");
                return;
            }
            console.log("WebExtension: permissions granted");
            browser.runtime.sendMessage({method: "ssoLogin", url, responsePattern});
        }
    }

    recaptchaHook() {
        const ua = new UAParser();
        if (ua.getBrowser().name !== "Firefox") {
            return false;
        }

        const openRiotIm = () => {
            window.open("https://riot.im/app/#/register");
        }
        return (
            <div>
                <div className="error" role="alert">
                    Registration on this homeserver requires ReCAPTCHA, which isn't supported in the
                    Firefox WebExtension yet due to policies around remote code execution.
                </div>
                <button onClick={openRiotIm} className="mx_Login_submit">Register on riot.im/app</button>
            </div>
        );
    }
}
