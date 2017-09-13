'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _coreFactoryMakerJs = require('../../../core/FactoryMaker.js');

var _coreFactoryMakerJs2 = _interopRequireDefault(_coreFactoryMakerJs);

var _coreDebug = require('../../../core/Debug');

var _coreDebug2 = _interopRequireDefault(_coreDebug);

var _SwitchRequestJs = require('../SwitchRequest.js');

var _SwitchRequestJs2 = _interopRequireDefault(_SwitchRequestJs);

function SwitchHistoryRule() {
    var context = this.context;
    var log = (0, _coreDebug2['default'])(context).getInstance().log;

    //MAX_SWITCH is the number of drops made. It doesn't consider the size of the drop.
    var MAX_SWITCH = 0.075;

    //Before this number of switch requests(no switch or actual), don't apply the rule.
    //must be < SwitchRequestHistory SWITCH_REQUEST_HISTORY_DEPTH to enable rule
    var SAMPLE_SIZE = 6;

    function getMaxIndex(rulesContext) {
        var switchRequestHistory = rulesContext.getSwitchHistory();
        var switchRequests = switchRequestHistory.getSwitchRequests();
        var drops = 0;
        var noDrops = 0;
        var dropSize = 0;
        var switchRequest = (0, _SwitchRequestJs2['default'])(context).create();

        for (var i = 0; i < switchRequests.length; i++) {
            if (switchRequests[i] !== undefined) {
                drops += switchRequests[i].drops;
                noDrops += switchRequests[i].noDrops;
                dropSize += switchRequests[i].dropSize;

                if (drops + noDrops >= SAMPLE_SIZE && drops / noDrops > MAX_SWITCH) {
                    switchRequest.quality = i > 0 && switchRequests[i].drops > 0 ? i - 1 : i;
                    switchRequest.reason = { index: switchRequest.quality, drops: drops, noDrops: noDrops, dropSize: dropSize };
                    log('Switch history rule index: ' + switchRequest.quality + ' samples: ' + (drops + noDrops) + ' drops: ' + drops);
                    break;
                }
            }
        }

        return switchRequest;
    }

    return {
        getMaxIndex: getMaxIndex
    };
}

SwitchHistoryRule.__dashjs_factory_name = 'SwitchHistoryRule';
var factory = _coreFactoryMakerJs2['default'].getClassFactory(SwitchHistoryRule);

exports['default'] = factory;
module.exports = exports['default'];
//# sourceMappingURL=SwitchHistoryRule.js.map
