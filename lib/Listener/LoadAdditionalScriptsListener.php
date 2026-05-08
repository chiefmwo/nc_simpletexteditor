<?php

declare(strict_types=1);

namespace OCA\SimpleTextEditor\Listener;

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCA\SimpleTextEditor\AppInfo\Application;
use OCP\EventDispatcher\Event;
use OCP\EventDispatcher\IEventListener;
use OCP\Util;

/**
 * Injects the files-plugin bundle into the Files app so the
 * "Mit Simple Text Editor bearbeiten" action is registered.
 *
 * @template-implements IEventListener<LoadAdditionalScriptsEvent>
 */
class LoadAdditionalScriptsListener implements IEventListener {

    public function handle(Event $event): void {
        if (!($event instanceof LoadAdditionalScriptsEvent)) {
            return;
        }

        Util::addScript(Application::APP_ID, 'editor-bundle');
    }
}
