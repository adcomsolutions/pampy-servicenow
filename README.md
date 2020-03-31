# Pampy / Service Now
[![License MIT](https://go-shields.herokuapp.com/license-MIT-blue.png)]()

This is a semi-port of Pampy.js to Service Now. "Semi-port" meaning that the core functionality is left (almost) fully intact, but that the API itself has been modified for convenience in the context of Service Now. Code made with vanilla Pampy.js is *not* compatible!

# Demonstrations

## You can write many patterns
Patterns are evaluated in the order they appear.

## You can write Fibonacci
The operator _ means "any other case I didn't think of".

```javascript
var fibFn = _(
  1, 1,
  2, 1,
  _, function (x) { return fibFn(x - 1) + fibFn(x - 2) }
);
```

## You can write a Lisp calculator in 5 lines

```javascript
var lisp = _(
  [Function, _.tail], function (f, rest) { return f.apply(null, rest.map(lisp)) },
  Array,              function(l) { return l.map(lisp) },
  _,                  _
)
function plus(a, b){ return a + b }
function minus(a, b){ return a - b }
function reduce(f, l){ return l.reduce(f) }

lisp([plus, 1, 2]);                 // => 3
lisp([plus, 1, [minus, 4, 2]]);     // => 3
lisp([reduce, plus, [1, 2, 3]]);    // => 6
```

## You can match so many things!

```javascript

var myString = _(
  3,                "this matches the number 3",

  Number,           "matches any JavaScript number",

  [String, Number], function(a, b){ return "a typed Array [a, b] that you can use in a function" },

  [1, 2, _],        "any Array of 3 elements that begins with [1, 2]",

  {x: _},           "any Object with a key 'x' and any value associated",

  _                "anything else"
)(x);
```

## You can match the tail of an Array

```javascript
x = [1, 2, 3];

_([1, _.tail], _)(x);    // => [2, 3]

_([_, _.tail], _)(x);    // => [1, [2, 3])

```

## You can nest Arrays

```javascript
x = [1, [2, 3], 4];

_([1, [_, 3], _], function (a, b) { return [1, [a, 3], b] });   // => [1, [2, 3], 4]
```

## You can nest Objects... And you can use _ as key!

```javascript
pet = { type: 'dog', details: { age: 3 } };

match(pet, {details: {age: _}}, _);        // => 3

match(pet, {_: {age: _}}, _);          // => ['details', 3]
```
Admittedly using `_` as key is a bit of a trick, but it works for most situations.

## You can use functions as patterns
```javascript 
_(
  function(x){ x > 3 }, function(x){return x + ' is > 3'},
  function(x){ x < 3 }, function(x){return x + ' is < 3'},
  function(x){ x === 3 }, function(x){return x + ' is = 3'}
)(x);
```

## You can pass [pattern, action] array pairs to _.pairs for better Prettier formatting.

```javascript
var fibFn = _.pairs(
  [0, 0],
  [1, 1],
  [2, 1],
  [3, 2],
  [4, 3],
  [_, function (x) {return fibFn(x - 1) + fibFn(x - 2)}]
);
```

## All the things you can match

| Pattern Example                | What it means                                            | Matched Example        | Arguments Passed to function  | NOT Matched Example     |
| ---------------                | --------------                                           | ---------------        | ----------------------------- | ------------------      |
| `"hello"`                      | only the string `"hello"` matches                        | `"hello"`              | nothing                       | any other value         |
| `Number`                       | Any javascript number                                    | `2.35`                 | `2.35`                        | any other value         |
| `String`                       | Any javascript string                                    | `"hello"`              | `"hello"`                     | any other value         |
| `Date`                         | Any javascript date                                      | `new Date`             | `(Date object)`               | any other value         |
| `Array`                        | Any array object                                         | `[1, 2]`               | `[1, 2]`                      | any other value         |
| `_`                            | Any value                                                |                        | that value                    |                         |
| `[1, 2, _]`                    | An Array that starts with 1, 2 and ends with any value   | `[1, 2, 3]`            | `3`                           | `[1, 2, 3, 4]`          |
| `[1, 2, _.tail]`               | An Array that start with 1, 2 and ends with any sequence | `[1, 2, 3, 4]`         | `[3, 4]`                      | `[1, 7, 7, 7]`          |
| `{ type:'dog', age: _ }`       | Any Object with `type: "dog"` and with an age            | `{type:"dog", age: 3}` | `3`                           | `{type:"cat", age:2}`   |
| `{ type:'dog', age: Number }`  | Any Object with `type: "dog"` and with an numeric age    | `{type:"dog", age: 3}` | `3`                           | `{type:"dog", age:2.3}` |
| `function(x) { return x > 3 }` | Anything greater than 3                                  | `5`                    | `3`                           | `2`                     |
| `null`                         | only `null`                                              | `null`                 | nothing                       | any other value         |
| `undefined`                    | only `undefined`                                         | `undefined`            | nothing                       | any other value         |

## Changes From vanilla Pampy.js

### Default Export

Because Service Now does not have a requires/import API, we are forced to export a single variable to the global scope.

This variable is '_' by default.

#### Dual-Purpose Default Export
To promote convenient use in shorter scripts, we make an effort to provide BOTH the pattern match expression and the 'ANY' expression in the same variable. This is much like how JQuery's $ export can be used as a function or a variable.

##### Example
``` javascript
_ // When used as a variable, this is equivalent to the Pampy.js ANY variable
_() // When used as a function, this is equivalent to the Pampy.js match function
```

### Modified API components
The entire API has been adjusted, see the table below regarding the nature of each change.
| New       | Vanilla      | Notes                                                                            |
|-----------|--------------|----------------------------------------------------------------------------------|
| _()       | match()      | Unlike Pampy.js Vanilla, we separate our target argument with a curried function |
| _         | ANY          | Unlike Pampy.js, we don't provide a second reference for the ANY constant        |
| _.pairs() | matchPairs() | Like with match(), we separate the target argument via currying                  |
| _.tail    | TAIL         | The REST alias for TAIL has been removed                                         |

#### Removed API components
For the sake of simplicity, some undocumented & redundant exports have been stripped.

| Removed    | Notes                                                |
|------------|------------------------------------------------------|
| ANY        | This was an alias for \_, use \_ instead             |
| REST       | This was an alias for TAIL, use _.tail instead       |
| HEAD       | Unused in the original implementation & undocumented |
| matchValue | Undocumented, seems to be for internal use only      |
| matchArray | Undocumented, seems to be for internal use only      |
| matchDict  | Undocumented, seems to be for internal use only      |
| matchAll   | Undocumented, seems to be for internal use only      |
| zipLongest | Undocumented, seems to be for internal use only      |

### Bad Pattern Matches Return Null
By default, Pampy would throw if a pattern match encountered an edge case that was not programmed in. This kind of "total function" enforcement is desirable in an FP environment, but not so much in Service Now, which generally favors terser scripting.
Instead of throwing, we silently return null in these situations.

### Curried Matchers
We curry our target argument, which fundamentally changes the usage of the _() and _.pairs() methods in comparison to the vanilla match()/matchPairs() functions.

This means that the patterns are provided _first_ and that the target value is provided second, in a separate argument set.

#### Example

``` javascript
var ticketNumber = _({number: _}, parseInt)(taskGlideRecord);
```

#### Rationale
We do this for two reasons: composability and convenience

##### Composability
Currying the function allows us to save a pattern match for later use with other GlideRecord values

``` javascript
var getTicketNumber = _({number: _}, parseFloat);
var ticketNumber1 = getTicketNumber(task1GlideRecord);
var ticketNumber2 = getTicketNumber(task2GlideRecord);
```

##### Convenience
Currying the function also allows us to conveniently nest additional pattern matches without additional syntax

``` javascript
var handleTicketString = _(
  Number, function(x){return x},
  String, _(
    function(x){return x.startsWith('CS')}, function(x){return parseFloat(x.slice(2))},
    function(x){return x.startsWith('INC')}, function(x){return parseFloat(x.slice(3))}
  )
)(ticketNumberInput);
```

### Pattern Matching Extensions
There are some places where additional functionality has been embedded to streamline working in an ES5 environment, as well as making Service Now data more accessible.

#### Right-Handed _ Returns Input
We extend the _ clause to return the input as-is when used on the right-handed side of a pattern match. This is effectively a subsitute for providing your own identity function

##### In Other Words

``` javascript
var numberOrNull = _(Number, _)(myNumber);
```

Is equivalent to...

``` javascript
var numberOrNull = _(Number, function(x){return x})(myNumber);
```


#### Right-Handed Error Throws
Providing an Error object or another object with the Error prototype to the right-hand side will automatically throw the supplied error.

``` javascript
var getTicketNumber = _(
  Number, _
  function(x) { return typeof(x) === 'string' && x.startsWith('CS') }, function(x){ return parseFloat(x.slice(2)) },
  _, Error('Not a valid ticket number!')
);
```

##### Caveats
* It is not possible to pass the pattern match argument to the Error when composed this way
* As a workaround, we programatically append information about the match argument to the Error message before throwing.

#### Date Handling
Vanilla Pampy.js only supports Number/String/Boolean/Array/Function type matching. We extend this with Date matching.

This includes type checking and equality comparisons.

##### Type Matching
One can test strictly for a Date type. 

``` javascript
var isDate = _(
  Date, true,
  _, false
)(myMaybeDate);
```

###### Caveats
* This is a strict type check. Inputs that could potentially be cast to Date are still not considered to be a Date!
* Keep in mind that Dates are also Objects, so it is adviseable to place a Date type check above any Object traversal in the same pattern match statement.

##### Equality Matching
One may also test equality against a Date pattern. Equality is evaluated as a strict comparison of the input Date timestamps. Unlike type matching, we will attempt casting the right-hand value to a Date before comparing if it is a number or string.

``` javascript
var matchesATime = _(
  mySpecificDate, true,
  123456789, true,
  'Tue Mar 31 2020 10:37:27 GMT-0400 (Eastern Daylight Time)', true
  _, false
)(myDate);
```

#### Automatic GlideElement conversion
If a GlideRecord is supplied to a matcher, the GlideElement properties are opportunistically converted to an equivalent JS type. This works for values of type String, Number, Boolean, and Date. 

This allows for strict equality checks. It also facilitates direct use of Pampy's built-in String/Number/Boolean/Date type matching.

##### Caveats
* Unrepresentable types are converted to null (empty Dates, Journal fields, etc.)
* This is a "best fit" conversion process. It is worth noting that, sometimes, this can sometimes have unexpected side effects (like dropping leading zeroes on number strings).
* Note that GlideDuration is also converted to a Date value. In these cases, the Date generated is equal to the length of the duration field, plus the Unix epoch.

##### Strict Equality on GlideRecord
``` javascript
var isSpecialTicketValue = _(
  0, true,
  Number, function(x){return x> 1000000},
  _, false
)(taskGlideRecord.u_funky_ticket_number);
```

##### Native Type Matching Against GlideElements
``` javascript
var rawVendorTicketNumber = _(
  String, function(x){return x.replace(/[A-z]/g, '')},
  Number, function(x){return x + 1000000}
)(taskGlideRecord.u_funky_vendor_number);
```

