class Router {
    static extractPath(params, start) {
        const path = [];
        for (let i = start; i < params.length; i += 1) {
            path.push(params[i].substr(24));
        }
        return path;
    }
}

module.exports = Router;
