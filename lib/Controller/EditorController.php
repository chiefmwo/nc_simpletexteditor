<?php

declare(strict_types=1);

namespace OCA\SimpleTextEditor\Controller;

use OCA\SimpleTextEditor\AppInfo\Application;
use OC\Security\CSP\ContentSecurityPolicyNonceManager;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\Files\IRootFolder;
use OCP\Files\NotFoundException;
use OCP\Files\NotPermittedException;
use OCP\IRequest;
use OCP\IURLGenerator;
use OCP\IUserSession;

class EditorController extends Controller {

    // Only allow saving plain-text content types via this editor.
    private const ALLOWED_MIMES = ['text/plain', 'text/'];

    public function __construct(
        IRequest $request,
        private readonly IRootFolder $rootFolder,
        private readonly IUserSession $userSession,
        private readonly IURLGenerator $urlGenerator,
        private readonly ContentSecurityPolicyNonceManager $nonceManager,
    ) {
        parent::__construct(Application::APP_ID, $request);
    }

    /**
     * Render the full-page editor view (blank layout = no NC navigation).
     */
    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function index(int $fileId): TemplateResponse {
        $user = $this->userSession->getUser();
        if ($user === null) {
            return $this->errorTemplate('Not logged in.');
        }

        try {
            $userFolder = $this->rootFolder->getUserFolder($user->getUID());
            $nodes      = $userFolder->getById($fileId);

            if (empty($nodes)) {
                return $this->errorTemplate('File not found.');
            }

            $fileName = $nodes[0]->getName();

        } catch (NotFoundException) {
            return $this->errorTemplate('File not found.');
        }

        return new TemplateResponse(
            Application::APP_ID,
            'editor',
            [
                'fileId'   => $fileId,
                'fileName' => $fileName,
                'loadUrl'  => $this->urlGenerator->linkToRoute(
                    'simpletexteditor.editor.getFile',
                    ['fileId' => $fileId]
                ),
                'saveUrl'  => $this->urlGenerator->linkToRoute(
                    'simpletexteditor.editor.saveFile',
                    ['fileId' => $fileId]
                ),
                'cssUrl'   => $this->urlGenerator->linkTo(
                    Application::APP_ID,
                    'css/editor.css'
                ),
                'jsUrl'    => $this->urlGenerator->linkTo(
                    Application::APP_ID,
                    'js/editor-bundle.js'
                ),
                'nonce'    => $this->nonceManager->getNonce(),
                'token'    => \OCP\Util::callRegister(),
            ],
            TemplateResponse::RENDER_AS_BLANK
        );
    }

    /**
     * Return file content as JSON.
     */
    #[NoAdminRequired]
    public function getFile(int $fileId): DataResponse {
        $user = $this->userSession->getUser();
        if ($user === null) {
            return new DataResponse(['error' => 'Not authenticated'], Http::STATUS_UNAUTHORIZED);
        }

        try {
            $userFolder = $this->rootFolder->getUserFolder($user->getUID());
            $nodes      = $userFolder->getById($fileId);

            if (empty($nodes)) {
                return new DataResponse(['error' => 'File not found'], Http::STATUS_NOT_FOUND);
            }

            $content = $nodes[0]->getContent();

        } catch (NotFoundException) {
            return new DataResponse(['error' => 'File not found'], Http::STATUS_NOT_FOUND);
        } catch (\Exception) {
            return new DataResponse(['error' => 'Could not read file'], Http::STATUS_INTERNAL_SERVER_ERROR);
        }

        return new DataResponse(['content' => $content]);
    }

    /**
     * Overwrite the file with submitted JSON content.
     */
    #[NoAdminRequired]
    public function saveFile(int $fileId): DataResponse {
        $user = $this->userSession->getUser();
        if ($user === null) {
            return new DataResponse(['error' => 'Not authenticated'], Http::STATUS_UNAUTHORIZED);
        }

        // Prefer IRequest parsing; fall back to raw JSON body (PUT requests).
        $body = $this->request->getParam('content');
        if ($body === null) {
            $raw     = file_get_contents('php://input');
            $decoded = json_decode($raw, true);
            $body    = $decoded['content'] ?? null;
        }

        if ($body === null) {
            return new DataResponse(['error' => 'Missing content'], Http::STATUS_BAD_REQUEST);
        }

        try {
            $userFolder = $this->rootFolder->getUserFolder($user->getUID());
            $nodes      = $userFolder->getById($fileId);

            if (empty($nodes)) {
                return new DataResponse(['error' => 'File not found'], Http::STATUS_NOT_FOUND);
            }

            $file = $nodes[0];

            // Guard: only allow editing text/* files via this endpoint.
            $mime = $file->getMimeType();
            if (!str_starts_with($mime, 'text/')) {
                return new DataResponse(['error' => 'File type not supported'], Http::STATUS_UNSUPPORTED_MEDIA_TYPE);
            }

            $file->putContent($body);

        } catch (NotFoundException) {
            return new DataResponse(['error' => 'File not found'], Http::STATUS_NOT_FOUND);
        } catch (NotPermittedException) {
            return new DataResponse(['error' => 'Permission denied'], Http::STATUS_FORBIDDEN);
        } catch (\Exception) {
            // Log the real exception server-side; return a generic message to the client.
            return new DataResponse(
                ['error' => 'Could not save file'],
                Http::STATUS_INTERNAL_SERVER_ERROR
            );
        }

        return new DataResponse(['status' => 'ok']);
    }

    private function errorTemplate(string $message): TemplateResponse {
        return new TemplateResponse(
            Application::APP_ID,
            'editor',
            ['error' => $message],
            TemplateResponse::RENDER_AS_BLANK
        );
    }
}
