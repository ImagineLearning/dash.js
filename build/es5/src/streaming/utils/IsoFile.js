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

var _voIsoBox = require('../vo/IsoBox');

var _voIsoBox2 = _interopRequireDefault(_voIsoBox);

var _coreFactoryMaker = require('../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

function IsoFile() {

    var instance = undefined,
        parsedIsoFile = undefined;

    /**
    * @param {string} type
    * @returns {IsoBox|null}
    * @memberof IsoFile#
    */
    function getBox(type) {
        if (!type || !parsedIsoFile || !parsedIsoFile.boxes || parsedIsoFile.boxes.length === 0) return null;

        return convertToDashIsoBox(parsedIsoFile.fetch(type));
    }

    /**
    * @param {string} type
    * @returns {Array|null} array of {@link IsoBox}
    * @memberof IsoFile#
    */
    function getBoxes(type) {
        if (!parsedIsoFile) {
            return null;
        }

        var boxData = parsedIsoFile.fetchAll(type);
        var boxes = [];
        var box = undefined;

        for (var i = 0, ln = boxData.length; i < ln; i++) {
            box = convertToDashIsoBox(boxData[i]);

            if (box) {
                boxes.push(box);
            }
        }

        return boxes;
    }

    /**
    * @param {string} value
    * @memberof IsoFile#
    */
    function setData(value) {
        parsedIsoFile = value;
    }

    /**
    * @returns {IsoBox|null}
    * @memberof IsoFile#
    */
    function getLastBox() {
        if (!parsedIsoFile || !parsedIsoFile.boxes || !parsedIsoFile.boxes.length) return null;

        var type = parsedIsoFile.boxes[parsedIsoFile.boxes.length - 1].type;
        var boxes = getBoxes(type);

        return boxes[boxes.length - 1];
    }

    function convertToDashIsoBox(boxData) {
        if (!boxData) return null;

        var box = new _voIsoBox2['default'](boxData);

        if (boxData.hasOwnProperty('_incomplete')) {
            box.isComplete = !boxData._incomplete;
        }

        return box;
    }

    instance = {
        getBox: getBox,
        getBoxes: getBoxes,
        setData: setData,
        getLastBox: getLastBox
    };

    return instance;
}
IsoFile.__dashjs_factory_name = 'IsoFile';
exports['default'] = _coreFactoryMaker2['default'].getClassFactory(IsoFile);
module.exports = exports['default'];
//# sourceMappingURL=IsoFile.js.map
