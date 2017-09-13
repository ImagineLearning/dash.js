/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _constantsConstants = require('../constants/Constants');

var _constantsConstants2 = _interopRequireDefault(_constantsConstants);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _TextSourceBuffer = require('./TextSourceBuffer');

var _TextSourceBuffer2 = _interopRequireDefault(_TextSourceBuffer);

var _TextTracks = require('./TextTracks');

var _TextTracks2 = _interopRequireDefault(_TextTracks);

var _utilsVTTParser = require('../utils/VTTParser');

var _utilsVTTParser2 = _interopRequireDefault(_utilsVTTParser);

var _utilsTTMLParser = require('../utils/TTMLParser');

var _utilsTTMLParser2 = _interopRequireDefault(_utilsTTMLParser);

function TextController() {

    var context = this.context;
    var instance = undefined;
    var textSourceBuffer = undefined;

    var allTracksAreDisabled = undefined,
        errHandler = undefined,
        dashManifestModel = undefined,
        manifestModel = undefined,
        mediaController = undefined,
        videoModel = undefined,
        streamController = undefined,
        textTracks = undefined,
        vttParser = undefined,
        ttmlParser = undefined;

    function setup() {

        textTracks = (0, _TextTracks2['default'])(context).getInstance();
        vttParser = (0, _utilsVTTParser2['default'])(context).getInstance();
        ttmlParser = (0, _utilsTTMLParser2['default'])(context).getInstance();
        textSourceBuffer = (0, _TextSourceBuffer2['default'])(context).getInstance();

        textTracks.initialize();

        reset();
    }

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.mediaController) {
            mediaController = config.mediaController;
        }
        if (config.videoModel) {
            videoModel = config.videoModel;
        }
        if (config.streamController) {
            streamController = config.streamController;
        }
        if (config.textTracks) {
            textTracks = config.textTracks;
        }
        if (config.vttParser) {
            vttParser = config.vttParser;
        }
        if (config.ttmlParser) {
            ttmlParser = config.ttmlParser;
        }

        // create config for source buffer
        textSourceBuffer.setConfig({
            errHandler: errHandler,
            dashManifestModel: dashManifestModel,
            manifestModel: manifestModel,
            mediaController: mediaController,
            videoModel: videoModel,
            streamController: streamController,
            textTracks: textTracks,
            vttParser: vttParser,
            ttmlParser: ttmlParser
        });
    }

    function getTextSourceBuffer() {
        return textSourceBuffer;
    }

    function getAllTracksAreDisabled() {
        return allTracksAreDisabled;
    }

    function addEmbeddedTrack(mediaInfo) {
        textSourceBuffer.addEmbeddedTrack(mediaInfo);
    }

    function setTextTrack() {

        var config = textSourceBuffer.getConfig();
        var fragmentModel = config.fragmentModel;
        var embeddedTracks = config.embeddedTracks;
        var isFragmented = config.isFragmented;
        var fragmentedTracks = config.fragmentedTracks;

        var tracks = videoModel.getTextTracks();
        var ln = tracks.length;
        var nrNonEmbeddedTracks = ln - embeddedTracks.length;
        var oldTrackIdx = textTracks.getCurrentTrackIdx();

        for (var i = 0; i < ln; i++) {
            var track = tracks[i];
            allTracksAreDisabled = track.mode !== _constantsConstants2['default'].TEXT_SHOWING;
            if (track.mode === _constantsConstants2['default'].TEXT_SHOWING) {
                if (oldTrackIdx !== i) {
                    // do not reset track if already the current track.  This happens when all captions get turned off via UI and then turned on again and with videojs.
                    textTracks.setCurrentTrackIdx(i);
                    textTracks.addCaptions(i, 0, null); // Make sure that previously queued captions are added as cues

                    // specific to fragmented text
                    if (isFragmented && i < nrNonEmbeddedTracks) {
                        var currentFragTrack = mediaController.getCurrentTrackFor(_constantsConstants2['default'].FRAGMENTED_TEXT, streamController.getActiveStreamInfo());
                        var newFragTrack = fragmentedTracks[i];
                        if (newFragTrack !== currentFragTrack) {
                            fragmentModel.abortRequests();
                            textTracks.deleteCuesFromTrackIdx(oldTrackIdx);
                            mediaController.setTrack(newFragTrack);
                            textSourceBuffer.setCurrentFragmentedTrackIdx(i);
                        }
                    }
                }
                break;
            }
        }

        if (allTracksAreDisabled) {
            textTracks.setCurrentTrackIdx(-1);
        }
    }

    function getCurrentTrackIdx() {
        var textTracks = textSourceBuffer.getConfig().textTracks;
        return textTracks.getCurrentTrackIdx();
    }

    function reset() {
        allTracksAreDisabled = false;
        textSourceBuffer.resetEmbedded();
    }

    instance = {
        setConfig: setConfig,
        getTextSourceBuffer: getTextSourceBuffer,
        getAllTracksAreDisabled: getAllTracksAreDisabled,
        addEmbeddedTrack: addEmbeddedTrack,
        setTextTrack: setTextTrack,
        getCurrentTrackIdx: getCurrentTrackIdx,
        reset: reset
    };
    setup();
    return instance;
}

TextController.__dashjs_factory_name = 'TextController';
exports['default'] = _coreFactoryMaker2['default'].getSingletonFactory(TextController);
module.exports = exports['default'];
//# sourceMappingURL=TextController.js.map
