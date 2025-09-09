module.exports = function fingerprintMiddleware(req, res, next) {
    try {
        // Extração de dados do fingerprint
        const fpEncoded = req.headers['x-fingerprint'];
        const ip = req.headers['x-client-ip'] || 
                  req.headers['x-forwarded-for'] || 
                  req.connection.remoteAddress || 
                  req.ip;
        
        let fingerprint = null;
        if (fpEncoded) {
            try {
                const decoded = Buffer.from(fpEncoded, 'base64').toString();
                fingerprint = JSON.parse(decoded);
            } catch (decodeError) {
                console.error('Erro ao decodificar fingerprint:', decodeError);
            }
        }

        // Anexa informações à requisição
        req.fingerprint = fingerprint;
        req.clientIp = ip;
        req.feature = req.headers['x-feature-name'] || 'unknown';
        req.timestamp = new Date().toISOString();

        next();
    } catch (err) {
        console.error('Erro em fingerprintMiddleware:', err);
        req.fingerprint = null;
        req.clientIp = req.ip;
        req.feature = 'unknown';
        req.timestamp = new Date().toISOString();
        next();
    }
};
