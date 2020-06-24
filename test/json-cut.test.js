const jsonCut = require('../src/utils/json-cut');

describe('json-cut', () => {
    let DATA
    beforeEach(() => {
       DATA = {
           a: 1,
           b: { c: { d: 2 } },
           e: [{ ea: 1 }, { eb: 2 }]
       };
    });
    it('Should return full data', () => {
        expect(jsonCut(DATA)).toEqual(DATA);
        expect(jsonCut(DATA, '1')).toEqual(DATA);
    });

    it('Should return data by path', () => {
        expect(jsonCut(DATA, 'a')).toEqual(1);
        expect(jsonCut(DATA, 'b.c')).toEqual({ d: 2 });
        expect(jsonCut(DATA, 'e[1]')).toEqual({ eb: 2 });
    });
});
