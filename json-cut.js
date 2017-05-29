module.exports = function(data, path) {
    if(!path || path === '1')
        return data

    const steps = path.split(/[\[\]\.]/);

    let result = data;
    steps.forEach((step) => {
        if(step === '')
            return;

        result = result[step];
    });

    return result;
}
