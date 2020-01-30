// @flow

/*
Copyright 2020 stoically@protonmail.com

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

import { MatrixClient } from "matrix-js-sdk/src/client";
import BaseEventIndexManager, {
    CrawlerCheckpoint,
    EventAndProfile,
    IndexStats,
    MatrixEvent,
    MatrixProfile,
    SearchArgs,
    SearchResult,
} from 'matrix-react-sdk/src/indexing/BaseEventIndexManager';
import WebPlatform from "./WebPlatform";
import UAParser from "ua-parser-js";
import React from "react";
import { _t } from "matrix-react-sdk/src/languageHandler";

declare global {
    const browser: any;
}

class SeshatIndexManager extends BaseEventIndexManager {
    async supportsEventIndexing(): Promise<boolean> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "supportsEventIndexing",
        });
    }

    async initEventIndex(): Promise<void> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "initEventIndex",
        });
    }

    async addEventToIndex(ev: MatrixEvent, profile: MatrixProfile): Promise<void> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "addEventToIndex",
            content: { ev, profile },
        });
    }

    async deleteEvent(eventId: string): Promise<boolean> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "deleteEvent",
            content: { eventId },
        });
    }

    async isEventIndexEmpty(): Promise<boolean> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "isEventIndexEmpty",
        });
    }

    async isRoomIndexed(roomId: string): Promise<boolean> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "isEventIndexEmpty",
            content: { roomId },
        });
    }

    async commitLiveEvents(): Promise<void> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "commitLiveEvents",
        });
    }

    async searchEventIndex(config: SearchArgs): Promise<SearchResult> {
        const term = config.search_term;

        return browser.runtime.sendMessage({
            type: "seshat",
            method: "searchEventIndex",
            content: { term, config },
        });
    }

    async addHistoricEvents(
        events: [EventAndProfile],
        checkpoint: CrawlerCheckpoint | null,
        oldCheckpoint: CrawlerCheckpoint | null
    ): Promise<boolean> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "addHistoricEvents",
            content: {
                events,
                checkpoint,
                oldCheckpoint,
            },
        });
    }

    async addCrawlerCheckpoint(checkpoint: CrawlerCheckpoint): Promise<void> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "addCrawlerCheckpoint",
            content: { checkpoint },
        });
    }

    async removeCrawlerCheckpoint(oldCheckpoint: CrawlerCheckpoint): Promise<void> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "removeCrawlerCheckpoint",
            content: { oldCheckpoint },
        });
    }

    async loadFileEvents(args): Promise<[EventAndProfile]> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "loadFileEvents",
            content: { ...args },
        });
    }

    async loadCheckpoints(): Promise<[CrawlerCheckpoint]> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "loadCheckpoints",
        });
    }

    async closeEventIndex(): Promise<void> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "closeEventIndex",
        });
    }

    async getStats(): Promise<IndexStats> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "getStats",
        });
    }

    async getUserVersion(): Promise<number> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "getUserVersion",
        });
    }

    async setUserVersion(version: number): Promise<void> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "setUserVersion",
            content: { version },
        });
    }

    async deleteEventIndex(): Promise<void> {
        return browser.runtime.sendMessage({
            type: "seshat",
            method: "deleteEventIndex",
        });
    }
}

export default class WebExtensionPlatform extends WebPlatform {
    private eventIndexManager: BaseEventIndexManager = new SeshatIndexManager();

    _getVersion(): Promise<string> {
        return browser.runtime.sendMessage({ type: "version" });
    }

    installUpdate() {
        browser.runtime.sendMessage({ type: "installUpdate" });
    }

    getConfig(): Promise<{}> {
        return browser.runtime.sendMessage({ type: "config" });
    }

    getHumanReadableName(): string {
        return "Radical"; // no translation required: only used for analytics
    }

    getDefaultDeviceDisplayName(): string {
        const ua = new UAParser();
        const appName = "Radical";
        const browserName = ua.getBrowser().name || "unknown browser";
        const osName = ua.getOS().name || "unknown os";
        return _t("%(appName)s via %(browserName)s on %(osName)s", {
            appName: appName,
            browserName: browserName,
            osName: osName,
        });
    }

    getEventIndexingManager(): BaseEventIndexManager | null {
        return this.eventIndexManager;
    }

    /**
     * Begin Single Sign On flows.
     * @param {MatrixClient} mxClient the matrix client using which we should start the flow
     * @param {"sso"|"cas"} loginType the type of SSO it is, CAS/SSO.
     */
    async startSingleSignOn(mxClient: MatrixClient, loginType: "sso" | "cas", fragmentAfterLogin: string) {
        const redirectURL = browser.identity.getRedirectURL();
        const url = mxClient.getSsoLoginUrl(redirectURL, loginType);
        const authorized = await browser.identity.launchWebAuthFlow({
            url,
            interactive: true,
        });

        const authorizedURL = new URL(authorized);
        const loginToken = authorizedURL.searchParams.get("loginToken");

        const loginUrl = this.getSSOCallbackUrl(fragmentAfterLogin);
        loginUrl.searchParams.set("loginToken", loginToken);
        // @ts-ignore
        window.location = loginUrl;
    }

    recaptchaHook(): false | JSX.Element {
        const ua = new UAParser();
        if (ua.getBrowser().name !== "Firefox") {
            return false;
        }

        const openRiotIm = () => {
            window.open("https://riot.im/app/#/register");
        };
        return (
            <div>
                <div className="error" role="alert">
                    Registration on this homeserver requires ReCAPTCHA, which
                    isn't supported in the Firefox WebExtension yet due to
                    policies around remote code execution.
                </div>
                <button onClick={openRiotIm} className="mx_Login_submit">
                    Register on riot.im/app
                </button>
            </div>
        );
    }

    async getPickleKey(userId: string, deviceId: string): Promise<string | null> {
        try {
            return await browser.runtime.sendMessage({
                type: "keytar",
                method: "getPickleKey",
                content: {
                    userId, deviceId,
                }
            });
        } catch (e) {
            return null;
        }
    }

    async createPickleKey(userId: string, deviceId: string): Promise<string | null> {
        try {
            return await browser.runtime.sendMessage({
                type: "keytar",
                method: "createPickleKey",
                content: {
                    userId, deviceId,
                }
            });
        } catch (e) {
            return null;
        }
    }

    async destroyPickleKey(userId: string, deviceId: string): Promise<void> {
        try {
            await browser.runtime.sendMessage({
                type: "keytar",
                method: "destroyPickleKey",
                content: {
                    userId, deviceId,
                }
            });
        } catch (e) {}
    }
}
