<?php

declare(strict_types=1);

namespace OCA\SimpleTextEditor\Controller;

use OCA\SimpleTextEditor\AppInfo\Application;
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
use OCP\Security\ICrypto;

class EditorController extends Controller {

    public function __construct(
        IRequest $request,
        private readonly IRootFolder $rootFolder,
        private readonly IUserSession $userSession,
        private readonly IURLGenerator $urlGenerator,
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
            return new TemplateResponse(
                Application::APP_ID,
                'editor',
                ['error' => 'Not logged in.'],
                TemplateResponse::RENDER_AS_BLANK
            );
        }

        try {
            $userFolder = $this->rootFolder->getUserFolder($user->getUID());
            $nodes      = $userFolder->getById($fileId);

            if (empty($nodes)) {
                return new TemplateResponse(
                    Application::APP_ID,
                    'editor',
                    ['error' => 'File not found.'],
                    TemplateResponse::RENDER_AS_BLANK
                );
            }

            $fileName = $nodes[0]->getName();

        } catch (NotFoundException) {
            return new TemplateResponse(
                Application::APP_ID,
                'editor',
                ['error' => 'File not found.'],
                TemplateResponse::RENDER_AS_BLANK
            );
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
        } catch (\Exception $e) {
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

        // Try query param first, then raw JSON body
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

            $nodes[0]->putContent($body);

        } catch (NotFoundException) {
            return new DataResponse(['error' => 'File not found'], Http::STATUS_NOT_FOUND);
        } catch (NotPermittedException) {
            return new DataResponse(['error' => 'Permission denied'], Http::STATUS_FORBIDDEN);
        } catch (\Exception $e) {
            return new DataResponse(
                ['error' => 'Could not save file: ' . $e->getMessage()],
                Http::STATUS_INTERNAL_SERVER_ERROR
            );
        }

        return new DataResponse(['status' => 'ok']);
    }
}
