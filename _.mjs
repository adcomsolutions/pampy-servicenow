"use strict";

const $_ = curryFn(match);
const PAD_VALUE = '$$$PadValueType';
const TAIL = '$$$TailType';

function isSymbolic(x) {
    return x === PAD_VALUE || x === TAIL
}

function isValue(x) {
    if (x === null || x === undefined) return true;
    if (isSymbolic(x)) return false;
    const t = typeof(x);
    return t === 'number' || t === 'string' || t === 'boolean';
}

function isDate(x) {
    return x instanceof Date;
}

function isNumber(x) {
    return typeof(x) === 'number' || x instanceof Number;
}

function isString(x) {
    const isSymbol = isSymbolic(x);
    const bool = typeof(x) === 'string' || x instanceof String;
    return !isSymbol && bool;
}

function isFunction(x) {
    return x instanceof Function && x !== $_;
}

function isObject(x) {
    return x instanceof Object && x != $_ && !Array.isArray(x) && !isValue(x);
}

function isGlideRecord(x) {
    return x instanceof GlideRecord;
}

function isGlideElement(x) {
    return x instanceof GlideElement;
}

// See my article on the SNOW community regarding the GlideRecord extraction methodology for details
// https://community.servicenow.com/community?id=community_article&sys_id=a609281adb9f80505ed4a851ca96196b
function extractRecord(glideRecord) {
    const out = {};

    for(key in glideRecord){
        if(key === 'sys_meta') continue;
        if(glideRecord[key] === null){
            gs.debug('Attempted to access non-existent GlideRecord property ' + key);
            continue;
        }
        out[key] = glideRecord.getValue(key) === null
            ? ''
            : glideRecord[key];
    }

    return out;
}

function extractElement(glideElement) {
    var elementString = glideElement.toString();
    if(elementString === 'true' || elementString === 'false')
        return elementString === 'true';
    if(!isNaN(parseFloat(elementString))){
        if(isFinite(elementString))
            return parseFloat(elementString);
        if(glideElement.dateNumericValue)
            return new Date(glideElement.dateNumericValue());
    }
    if(elementString === '') return null;
    return elementString
}

function run(action, x) {
    if (isValue(action)) {
        return action;
    }
    else if (action instanceof Error) {
        action.message = `Error thrown by matched pattern for ${x} (Type: ${typeof x}):\n${action.name}: ${action.message}\n`;
        throw action;
    }
    else if (isFunction(action)) {
        return action.apply(null, x);
    }
    else if (isObject(action)) {
        return action;
    }
    else if (action === $_) {
        return x;
    }
    else {
        throw new MatchError(`Unsupported action type ${typeof(action)} of action ${action}.`)
    }
}


function matchValue(patt, value) {
    // Extract data from Service Now data types before proceeding
    if (isGlideRecord) {
        value = extractRecord(value);
    } else if (isGlideElement) {
        value = extractElement(value);
    }

    if (patt === '_') {
        // Behaves like UnderscoreType
        return [true, [value]];
    }
    else if (patt === PAD_VALUE) {
        return [false, []];
    }
    else if (patt === String) {
        if (isString(value))
            return [true, [value]];
        else return [false, []];
    }
    else if (patt === Number) {
        if (isNumber(value))
            return [true, [value]];
        else return [false, []];
    }
    else if (patt === Boolean) {
        let bool = typeof(value) === 'boolean' || value instanceof Boolean;
        if (bool) return [bool, [value]];
        else return [false, []];
    }
    else if (patt === Array) {
        if (value instanceof Array) {
            return [true, [value]];
        }
        else return [false, []];
    }
    else if (patt === Date) {
        if(isDate(value))
            return [true, [value]];
        else return [false, []];
    }
    else if (Array.isArray(patt)) {
        return matchArray(patt, value)
    }
    else if (patt === Function) {
        // console.log(`[${patt}] === Function`);
        try {
            if (value instanceof patt)
                return [true, [value]];
            return [false, []];
        }
        catch (err) {
        }
    }
    else if (isValue(patt)) {
        return [patt === value, []]
    }
    else if (isDate(patt)) {
        const dateEquality = (dateA, dateB) =>
              dateA.getTime() === dateB.getTime()
              ? [true, [value]]
              : [false, []];

        if (isDate(value)) {
            return dateEquality(patt, value);
        } else if (isNumber(value) || isString(value)) {
            return dateEquality(patt, new Date(value))
        } else {
            return [false, []];
        }
    }
    else if (patt === $_) {
        return [true, [value]];
    }
    else if (isFunction(patt)) {
        let ret = patt(value);
        if (ret === true) return [true, [value]];
        else return [false, []];
    }
    else if (isObject(patt)) {
        return matchDict(patt, value);
    }
    else {
        throw new MatchError(`Pattern ${patt} has unsupported type ${typeof(patt)}.`);
    }
    return [false, []];
}


function matchArray(patt, value) {
    if (!(patt instanceof Array) || !(value instanceof Array)) {
        return [false, []];
    }
    let totalExtracted = [];
    const pairs = zipLongest(patt, value);
    for (let i = 0; i < pairs.length; i++) {
        const [pi, vi] = pairs[i];

        if (pi === TAIL) {
            if (!onlyPadValuesFollow(pairs, i + 1)) {
                throw new MatchError("TAIL/REST must be the last element of a pattern.");
            }
            else {
                totalExtracted = totalExtracted.concat([value.slice(i)]);
                break;
            }
        }
        else {
            let [matched, extracted] = matchValue(pi, vi);
            if (!matched) {
                return [false, []];
            }
            else totalExtracted = totalExtracted.concat(extracted);
        }

    }
    return [true, totalExtracted];
}


function keysSet(x) {
    let set = {};
    for (let key in x) {
        set[key] = true;
    }
    return set;
}

function matchDict(patt, value) {
    if (!isObject(patt) || !isObject(value)) {
        return [false, []];
    }
    let totalExtracted = [];
    let stillUsablePatternKeys = keysSet(patt);
    let stillUsableValueKeys = keysSet(value);
    for (let pkey in patt) {
        if (!(pkey in stillUsablePatternKeys)) continue;
        let pval = patt[pkey];
        let matchedLeftAndRight = false;
        for (let vkey in value) {
            if (!(vkey in stillUsableValueKeys)) continue;
            if (!(pkey in stillUsablePatternKeys)) continue;
            let vval = value[vkey];
            let [keyMatched, keyExtracted] = matchValue(pkey, vkey);
            if (keyMatched) {
                let [valMatched, valExtracted] = matchValue(pval, vval);
                if (valMatched) {
                    delete stillUsablePatternKeys[pkey];
                    delete stillUsableValueKeys[vkey];
                    totalExtracted = totalExtracted.concat(keyExtracted, valExtracted);
                    matchedLeftAndRight = true;
                }
            }
        }
        if (!matchedLeftAndRight)
            return [false, []];
    }
    return [true, totalExtracted];
}

function pairwise(args) {
    let res = [];
    for (let i = 0; i < args.length; i += 2) {
        res.push([args[i], args[i + 1]]);
    }
    return res;
}

function onlyPadValuesFollow(pairs, i) {
    for (; i < pairs.length; i++) {
        if (pairs[i][0] !== PAD_VALUE) {
            return false;
        }
    }
    return true;
}


function matchPairs(x, ...pairs) {
  if (!pairs.every(p => p.length && p.length === 2)) {
    throw new MatchError(
      'Even number of pattern-action pairs. Every pattern should have an action.'
    )
  }

  for (let i = 0; i < pairs.length; i++) {
    let [patt, action] = pairs[i]

    let [matched, extracted] = matchValue(patt, x)
    if (matched) {
      return run(action, extracted)
    }
  }
  // Return null in a no match scenario instead of throwing, comment out the return if you want to enforce total functions
  return null;
  throw new MatchError(`No _ provided, case ${x} not handled.`)
}


function match(x) {
    const args = [...arguments].slice(1);
    if (args.length % 2 !== 0) {
        throw new MatchError("Even number of pattern-action pairs. Every pattern should have an action.");
    }

    let pairs = pairwise(args);

    return matchPairs(x, ...pairs)
}

function curryFn (fn) {
    return (...args) => (target) => fn(target, ...args);
}

function zipLongest(a, b) {
    let maxLen = Math.max(a.length, b.length);
    let res = [];
    for (let i = 0; i < maxLen; i++) {
        let ai = a[i] !== undefined ? a[i] : PAD_VALUE;
        let bi = b[i] !== undefined ? b[i] : PAD_VALUE;
        res.push([ai, bi]);
    }
    return res;
}

const MatchError = Class.create();
MatchError.prototype = Object.extend(Error, {
    name: 'MatchError',
    type: 'MatchError'
});

$_.pairs = curryFn(matchPairs);
$_.tail = TAIL;

export default $_;
