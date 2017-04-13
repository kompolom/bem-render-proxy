var path = require('path');

module.exports = function(req, res, data) {
    if (!req.query.patch) {
        return;
    }

    var patches = req.query.patch.split(';');

    patches.forEach(function(patch) {

        console.log('APPLY-PATCH: ' + patch);

        try {
            var pathToPatch = path.resolve(path.join('data', 'patch', patch));

            delete require.cache[require.resolve(pathToPatch)];
            require(pathToPatch)(data);

        } catch (err) {
            console.error(err);
        }
    })

}

