const path = require('path');

module.exports = function(req, res, data, patchRoot) {
    if (!req.query.patch) {
        return;
    }

    const patches = req.query.patch.split(';');

    patches.forEach(function(patch) {

        console.log('APPLY-PATCH: ' + patch);

        try {
            const pathToPatch = path.resolve(
                patchRoot?
                    path.join(patchRoot, patch) :
                    path.join('data', 'patch', patch));

            delete require.cache[require.resolve(pathToPatch)];
            require(pathToPatch)(data);

        } catch (err) {
            console.error(err);
        }
    })

}

