"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const url_1 = require("./url");
(0, vitest_1.describe)('path handling', () => {
    (0, vitest_1.test)('parse and serialize an URL without path', () => {
        (0, vitest_1.expect)(new url_1.Url('https://example.com').toString()).toStrictEqual('https://example.com');
    });
    (0, vitest_1.test)('parse and serialize an URL without path, removing trailing slash', () => {
        (0, vitest_1.expect)(new url_1.Url('https://example.com/').toString()).toStrictEqual('https://example.com');
    });
    (0, vitest_1.test)('parse and serialize an URL with path component', () => {
        (0, vitest_1.expect)(new url_1.Url('https://example.com/path').toString()).toStrictEqual('https://example.com/path');
    });
    (0, vitest_1.test)('parse and serialize an URL with path component, removing trailing slash', () => {
        (0, vitest_1.expect)(new url_1.Url('https://example.com/path/').toString()).toStrictEqual('https://example.com/path');
    });
});
(0, vitest_1.describe)('relative URL handling', () => {
    (0, vitest_1.test)('parse and serialize a relative path', () => {
        (0, vitest_1.expect)(new url_1.Url('/sample-path').toString()).toStrictEqual('/sample-path');
    });
    (0, vitest_1.test)('parse and serialize a relative path preserving path and hash components', () => {
        (0, vitest_1.expect)(new url_1.Url('/sample-path?sample_var=sample_value#sample_hash').toString()).toStrictEqual('/sample-path?sample_var=sample_value#sample_hash');
    });
});
(0, vitest_1.describe)('empty scheme handling', () => {
    (0, vitest_1.test)('parse and serialize an URl without scheme', () => {
        (0, vitest_1.expect)(new url_1.Url('//example.com/sample-path').toString()).toStrictEqual('//example.com/sample-path');
    });
    (0, vitest_1.test)('parse and serialize a relative path preserving path and hash components', () => {
        (0, vitest_1.expect)(new url_1.Url('//example.com:1234/sample-path?sample_var=sample_value#sample_hash').toString()).toStrictEqual('//example.com:1234/sample-path?sample_var=sample_value#sample_hash');
    });
});
(0, vitest_1.describe)('query parameter handling', () => {
    const SAMPLE_URL = 'https://example.com:1234/sample-path?sample_param=sample_value';
    (0, vitest_1.test)('parse and serialize an url to the original input', () => {
        (0, vitest_1.expect)(new url_1.Url(SAMPLE_URL).toString()).toStrictEqual(SAMPLE_URL);
    });
    (0, vitest_1.test)('parse a URL containing escaped query parameters', () => {
        (0, vitest_1.expect)(new url_1.Url('https://example.com:1234/sample-path?key+that+needs+encoding%21=sample%21').query).toStrictEqual({
            'key that needs encoding!': 'sample!',
        });
    });
    (0, vitest_1.test)('serialize an url without query', () => {
        (0, vitest_1.expect)(new url_1.Url('https://example.com:1234/sample-path').toString()).toStrictEqual('https://example.com:1234/sample-path');
    });
    (0, vitest_1.test)('merge existing query params', () => {
        (0, vitest_1.expect)(new url_1.Url(SAMPLE_URL).setQuery('new_query_pram', 'new_query_value').toString()).toStrictEqual('https://example.com:1234/sample-path?sample_param=sample_value&new_query_pram=new_query_value');
    });
    (0, vitest_1.test)('replace existing query params instead of adding with the same key', () => {
        (0, vitest_1.expect)(new url_1.Url(SAMPLE_URL).setQuery('sample_param', 'new_value').toString()).toStrictEqual('https://example.com:1234/sample-path?sample_param=new_value');
    });
    (0, vitest_1.test)('properly serialize query params and URL encode them when needed', () => {
        (0, vitest_1.expect)(new url_1.Url(SAMPLE_URL)
            .setQuery('ascii', ` ,;:!?'()/&+=$@`)
            .setQuery('encoding_optional', `*-.`)
            .setQuery('non_ascii', `çÁâÑ清ゆ`)
            .setQuery('key that needs encoding!', `sample`)
            .toString()).toStrictEqual('https://example.com:1234/sample-path' +
            '?sample_param=sample_value' +
            '&ascii=+%2C%3B%3A%21%3F%27%28%29%2F%26%2B%3D%24%40' +
            '&encoding_optional=*-.' +
            '&non_ascii=%C3%A7%C3%81%C3%A2%C3%91%E6%B8%85%E3%82%86' +
            '&key+that+needs+encoding%21=sample');
    });
});
(0, vitest_1.describe)('isAbsolute', () => {
    (0, vitest_1.test)('returns true for full URL', () => {
        (0, vitest_1.expect)(new url_1.Url('https://example.com/sample-path').isAbsolute()).toStrictEqual(true);
    });
    (0, vitest_1.test)('returns false when URL has no protocol', () => {
        (0, vitest_1.expect)(new url_1.Url('//example.com/sample-path').isAbsolute()).toStrictEqual(false);
    });
    (0, vitest_1.test)('returns false for relative URL', () => {
        (0, vitest_1.expect)(new url_1.Url('/sample-path').isAbsolute()).toStrictEqual(false);
    });
});
(0, vitest_1.describe)('isProtocolRelative', () => {
    (0, vitest_1.test)('returns true when URL has no protocol', () => {
        (0, vitest_1.expect)(new url_1.Url('//example.com/sample-path').isProtocolRelative()).toStrictEqual(true);
    });
    (0, vitest_1.test)('returns false for full URL', () => {
        (0, vitest_1.expect)(new url_1.Url('https://example.com/sample-path').isProtocolRelative()).toStrictEqual(false);
    });
    (0, vitest_1.test)('returns false when for relative URL', () => {
        (0, vitest_1.expect)(new url_1.Url('/sample-path').isProtocolRelative()).toStrictEqual(false);
    });
});
(0, vitest_1.describe)('isRootRelative', () => {
    (0, vitest_1.test)('returns true when for relative URL', () => {
        (0, vitest_1.expect)(new url_1.Url('/sample-path').isRootRelative()).toStrictEqual(true);
    });
    (0, vitest_1.test)('returns false for full URL', () => {
        (0, vitest_1.expect)(new url_1.Url('https://example.com/sample-path').isRootRelative()).toStrictEqual(false);
    });
    (0, vitest_1.test)('returns false when URL has host but no protocol', () => {
        (0, vitest_1.expect)(new url_1.Url('//example.com/sample-path').isRootRelative()).toStrictEqual(false);
    });
});
