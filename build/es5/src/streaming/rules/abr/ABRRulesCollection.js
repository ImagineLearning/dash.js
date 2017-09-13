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

var _ThroughputRule = require('./ThroughputRule');

var _ThroughputRule2 = _interopRequireDefault(_ThroughputRule);

var _InsufficientBufferRule = require('./InsufficientBufferRule');

var _InsufficientBufferRule2 = _interopRequireDefault(_InsufficientBufferRule);

var _AbandonRequestsRule = require('./AbandonRequestsRule');

var _AbandonRequestsRule2 = _interopRequireDefault(_AbandonRequestsRule);

var _DroppedFramesRuleJs = require('./DroppedFramesRule.js');

var _DroppedFramesRuleJs2 = _interopRequireDefault(_DroppedFramesRuleJs);

var _SwitchHistoryRuleJs = require('./SwitchHistoryRule.js');

var _SwitchHistoryRuleJs2 = _interopRequireDefault(_SwitchHistoryRuleJs);

var _BolaRule = require('./BolaRule');

var _BolaRule2 = _interopRequireDefault(_BolaRule);

var _coreFactoryMaker = require('../../../core/FactoryMaker');

var _coreFactoryMaker2 = _interopRequireDefault(_coreFactoryMaker);

var _SwitchRequestJs = require('../SwitchRequest.js');

var _SwitchRequestJs2 = _interopRequireDefault(_SwitchRequestJs);

var QUALITY_SWITCH_RULES = 'qualitySwitchRules';
var ABANDON_FRAGMENT_RULES = 'abandonFragmentRules';

function ABRRulesCollection(config) {

    var context = this.context;

    var mediaPlayerModel = config.mediaPlayerModel;
    var metricsModel = config.metricsModel;
    var dashMetrics = config.dashMetrics;

    var instance = undefined,
        qualitySwitchRules = undefined,
        abandonFragmentRules = undefined;

    function initialize() {
        qualitySwitchRules = [];
        abandonFragmentRules = [];

        if (mediaPlayerModel.getUseDefaultABRRules()) {

            // Only one of BolaRule and ThroughputRule will give a switchRequest.quality !== SwitchRequest.NO_CHANGE.
            // This is controlled by useBufferOccupancyABR mechanism in AbrController.
            qualitySwitchRules.push((0, _BolaRule2['default'])(context).create({
                metricsModel: metricsModel,
                dashMetrics: dashMetrics,
                mediaPlayerModel: mediaPlayerModel
            }));
            qualitySwitchRules.push((0, _ThroughputRule2['default'])(context).create({
                metricsModel: metricsModel,
                dashMetrics: dashMetrics
            }));

            qualitySwitchRules.push((0, _InsufficientBufferRule2['default'])(context).create({
                metricsModel: metricsModel,
                dashMetrics: dashMetrics
            }));
            qualitySwitchRules.push((0, _SwitchHistoryRuleJs2['default'])(context).create());
            qualitySwitchRules.push((0, _DroppedFramesRuleJs2['default'])(context).create());

            abandonFragmentRules.push((0, _AbandonRequestsRule2['default'])(context).create({
                metricsModel: metricsModel,
                dashMetrics: dashMetrics,
                mediaPlayerModel: mediaPlayerModel
            }));
        }

        // add custom ABR rules if any
        var customRules = mediaPlayerModel.getABRCustomRules();
        customRules.forEach(function (rule) {
            if (rule.type === QUALITY_SWITCH_RULES) {
                qualitySwitchRules.push(rule.rule(context).create());
            }

            if (rule.type === ABANDON_FRAGMENT_RULES) {
                abandonFragmentRules.push(rule.rule(context).create());
            }
        });
    }

    function getActiveRules(srArray) {
        return srArray.filter(function (sr) {
            return sr.quality > _SwitchRequestJs2['default'].NO_CHANGE;
        });
    }

    function getMinSwitchRequest(srArray) {

        var values = {};
        var i = undefined,
            len = undefined,
            req = undefined,
            newQuality = undefined,
            quality = undefined;

        if (srArray.length === 0) {
            return;
        }

        values[_SwitchRequestJs2['default'].PRIORITY.STRONG] = _SwitchRequestJs2['default'].NO_CHANGE;
        values[_SwitchRequestJs2['default'].PRIORITY.WEAK] = _SwitchRequestJs2['default'].NO_CHANGE;
        values[_SwitchRequestJs2['default'].PRIORITY.DEFAULT] = _SwitchRequestJs2['default'].NO_CHANGE;

        for (i = 0, len = srArray.length; i < len; i += 1) {
            req = srArray[i];
            if (req.quality !== _SwitchRequestJs2['default'].NO_CHANGE) {
                values[req.priority] = values[req.priority] > _SwitchRequestJs2['default'].NO_CHANGE ? Math.min(values[req.priority], req.quality) : req.quality;
            }
        }

        if (values[_SwitchRequestJs2['default'].PRIORITY.WEAK] !== _SwitchRequestJs2['default'].NO_CHANGE) {
            newQuality = values[_SwitchRequestJs2['default'].PRIORITY.WEAK];
        }

        if (values[_SwitchRequestJs2['default'].PRIORITY.DEFAULT] !== _SwitchRequestJs2['default'].NO_CHANGE) {
            newQuality = values[_SwitchRequestJs2['default'].PRIORITY.DEFAULT];
        }

        if (values[_SwitchRequestJs2['default'].PRIORITY.STRONG] !== _SwitchRequestJs2['default'].NO_CHANGE) {
            newQuality = values[_SwitchRequestJs2['default'].PRIORITY.STRONG];
        }

        if (newQuality !== _SwitchRequestJs2['default'].NO_CHANGE) {
            quality = newQuality;
        }

        return (0, _SwitchRequestJs2['default'])(context).create(quality);
    }

    function getMaxQuality(rulesContext) {
        var switchRequestArray = qualitySwitchRules.map(function (rule) {
            return rule.getMaxIndex(rulesContext);
        });
        var activeRules = getActiveRules(switchRequestArray);
        var maxQuality = getMinSwitchRequest(activeRules);

        return maxQuality || (0, _SwitchRequestJs2['default'])(context).create();
    }

    function shouldAbandonFragment(rulesContext) {
        var abandonRequestArray = abandonFragmentRules.map(function (rule) {
            return rule.shouldAbandon(rulesContext);
        });
        var activeRules = getActiveRules(abandonRequestArray);
        var shouldAbandon = getMinSwitchRequest(activeRules);

        return shouldAbandon || (0, _SwitchRequestJs2['default'])(context).create();
    }

    function reset() {
        [qualitySwitchRules, abandonFragmentRules].forEach(function (rules) {
            if (rules && rules.length) {
                rules.forEach(function (rule) {
                    return rule.reset && rule.reset();
                });
            }
        });
        qualitySwitchRules = [];
        abandonFragmentRules = [];
    }

    instance = {
        initialize: initialize,
        reset: reset,
        getMaxQuality: getMaxQuality,
        shouldAbandonFragment: shouldAbandonFragment
    };

    return instance;
}

ABRRulesCollection.__dashjs_factory_name = 'ABRRulesCollection';
var factory = _coreFactoryMaker2['default'].getClassFactory(ABRRulesCollection);
factory.QUALITY_SWITCH_RULES = QUALITY_SWITCH_RULES;
factory.ABANDON_FRAGMENT_RULES = ABANDON_FRAGMENT_RULES;
_coreFactoryMaker2['default'].updateSingletonFactory(ABRRulesCollection.__dashjs_factory_name, factory);

exports['default'] = factory;
module.exports = exports['default'];
//# sourceMappingURL=ABRRulesCollection.js.map
