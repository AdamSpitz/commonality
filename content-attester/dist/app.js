import { calculatePaymentRequired, classifyBlockchainError, createAttesterApp, createPaymentRequiredResponse, createRateLimiter, formatBlockchainError, getHttpStatusForError, getPaymentFromHeader, registerCommonAttesterRoutes, uploadToIpfs, validatePayment, } from '@commonality/attester-core';
import { getSubjectIdForContentCanonicalId } from './blockchain.js';
export function createContentAttesterServiceApp(dependencies) {
    const app = createAttesterApp();
    const evaluationRateLimiter = createRateLimiter({
        windowMs: dependencies.getConfig().rateLimitWindowMs,
        maxRequests: dependencies.getConfig().rateLimitMaxRequests,
        message: 'Too many content evaluation requests. Please wait before trying again.',
    });
    async function requirePayment(req, res, next) {
        const xPaymentProof = req.headers['x-payment-proof'];
        const paymentId = getPaymentFromHeader(xPaymentProof);
        if (!paymentId || !validatePayment(paymentId)) {
            const gasPrice = await dependencies.getCurrentGasPrice();
            const paymentDetails = calculatePaymentRequired(gasPrice, dependencies.getPaymentConfig(dependencies.getConfig()));
            res.status(402).json(createPaymentRequiredResponse(paymentDetails));
            return;
        }
        next();
    }
    registerCommonAttesterRoutes(app, {
        getConfig: dependencies.getConfig,
        getCurrentGasPrice: dependencies.getCurrentGasPrice,
        getPaymentConfig: dependencies.getPaymentConfig,
        checkAttesterBalance: dependencies.checkAttesterBalance,
        version: dependencies.version,
        statusRoute: {
            path: '/status/:statementCid/:contentCanonicalId',
            requiredParams: ['statementCid', 'contentCanonicalId'],
            missingParamsMessage: 'Missing required parameters: statementCid, contentCanonicalId',
            paymentDescription: 'Payment required to check content attestation status',
        },
    });
    app.post('/evaluate-content', evaluationRateLimiter, requirePayment, async (req, res) => {
        const startTime = Date.now();
        try {
            const body = req.body;
            const sourceCount = [body.contentText, body.contentUrl, body.contentCid].filter(Boolean).length;
            if (!body.contentCanonicalId || !body.statementCid) {
                res.status(400).json({
                    error: 'invalid_request',
                    message: 'Missing required fields: contentCanonicalId, statementCid',
                });
                return;
            }
            if (sourceCount !== 1) {
                res.status(400).json({
                    error: 'invalid_request',
                    message: 'Provide exactly one of contentText, contentUrl, or contentCid',
                });
                return;
            }
            const config = dependencies.getConfig();
            const ipfsConfig = dependencies.getIpfsConfig(config);
            const content = await dependencies.resolveContent({
                contentText: body.contentText,
                contentUrl: body.contentUrl,
                contentCid: body.contentCid,
            }, ipfsConfig);
            const evaluation = await dependencies.evaluateContent({
                content,
                declaredPerspective: body.declaredPerspective,
                apiKey: config.openRouterApiKey,
                model: config.openRouterModel,
                promptTemplate: config.promptTemplate,
                attesterName: config.attesterName,
            });
            if (!evaluation.decision || evaluation.confidence === 'low') {
                res.json({
                    alreadyAttested: false,
                    decision: evaluation.decision,
                    confidence: evaluation.confidence,
                    reasoning: evaluation.reasoning,
                    dimensions: evaluation.dimensions,
                    subjectId: getSubjectIdForContentCanonicalId(body.contentCanonicalId),
                    explanationCid: null,
                    transactionHash: null,
                    processingTime: Date.now() - startTime,
                });
                return;
            }
            const explanationPayload = {
                attesterName: config.attesterName,
                contentCanonicalId: body.contentCanonicalId,
                statementCid: body.statementCid,
                decision: evaluation.decision,
                confidence: evaluation.confidence,
                reasoning: evaluation.reasoning,
                dimensions: evaluation.dimensions,
                declaredPerspective: body.declaredPerspective ?? null,
                timestamp: new Date().toISOString(),
            };
            const uploadResult = await dependencies.uploadExplanation(ipfsConfig, JSON.stringify(explanationPayload));
            const explanationCid = uploadResult.cid;
            let transactionHash;
            try {
                transactionHash = await dependencies.publishAttestation(body.contentCanonicalId, body.statementCid, config.alignmentTopicStatementCid);
            }
            catch (error) {
                const blockchainError = classifyBlockchainError(error);
                const formattedError = formatBlockchainError(blockchainError);
                res.status(getHttpStatusForError(blockchainError)).json({
                    error: blockchainError.code,
                    message: formattedError.message,
                    details: formattedError.details,
                    decision: evaluation.decision,
                    confidence: evaluation.confidence,
                    reasoning: evaluation.reasoning,
                    dimensions: evaluation.dimensions,
                    explanationCid,
                });
                return;
            }
            res.json({
                alreadyAttested: false,
                decision: evaluation.decision,
                confidence: evaluation.confidence,
                reasoning: evaluation.reasoning,
                dimensions: evaluation.dimensions,
                subjectId: getSubjectIdForContentCanonicalId(body.contentCanonicalId),
                explanationCid,
                transactionHash,
                processingTime: Date.now() - startTime,
            });
        }
        catch (error) {
            const blockchainError = classifyBlockchainError(error);
            if (blockchainError.code !== 'unknown_error') {
                const formattedError = formatBlockchainError(blockchainError);
                res.status(getHttpStatusForError(blockchainError)).json({
                    error: blockchainError.code,
                    message: formattedError.message,
                    details: formattedError.details,
                });
                return;
            }
            res.status(500).json({
                error: 'internal_error',
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
            });
        }
    });
    return app;
}
export const defaultUploadExplanation = uploadToIpfs;
//# sourceMappingURL=app.js.map