'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _coreFactoryMakerJs = require('../../../core/FactoryMaker.js');

var _coreFactoryMakerJs2 = _interopRequireDefault(_coreFactoryMakerJs);

var _SwitchRequestJs = require('../SwitchRequest.js');

var _SwitchRequestJs2 = _interopRequireDefault(_SwitchRequestJs);

var _coreDebug = require('../../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

function DroppedFramesRule() {
    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;

    var DROPPED_PERCENTAGE_FORBID = 0.15;
    var GOOD_SAMPLE_SIZE = 375; //Don't apply the rule until this many frames have been rendered(and counted under those indices).

    function getMaxIndex(rulesContext) {
        var droppedFramesHistory = rulesContext.getDroppedFramesHistory();
        if (droppedFramesHistory) {
            var dfh = droppedFramesHistory.getFrameHistory();
            var droppedFrames = 0;
            var totalFrames = 0;
            var maxIndex = _SwitchRequestJs2['default'].NO_CHANGE;
            for (var i = 1; i < dfh.length; i++) {
                //No point in measuring dropped frames for the zeroeth index.
                if (dfh[i]) {
                    droppedFrames = dfh[i].droppedVideoFrames;
                    totalFrames = dfh[i].totalVideoFrames;

                    if (totalFrames > GOOD_SAMPLE_SIZE && droppedFrames / totalFrames > DROPPED_PERCENTAGE_FORBID) {
                        maxIndex = i - 1;
                        log('DroppedFramesRule, index: ' + maxIndex + ' Dropped Frames: ' + droppedFrames + ' Total Frames: ' + totalFrames);
                        break;
                    }
                }
            }
            return (0, _SwitchRequestJs2['default'])(context).create(maxIndex, { droppedFrames: droppedFrames });
        }

        return (0, _SwitchRequestJs2['default'])(context).create();
    }

    return {
        getMaxIndex: getMaxIndex
    };
}

DroppedFramesRule.__dashjs_factory_name = 'DroppedFramesRule';
var factory = _coreFactoryMakerJs2['default'].getClassFactory(DroppedFramesRule);

exports['default'] = factory;
module.exports = exports['default'];
//# sourceMappingURL=DroppedFramesRule.js.map
