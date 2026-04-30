<?php

declare(strict_types=1);

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCP\EventDispatcher\IEventDispatcher;
use OCP\Server;
use OCP\Util;

// Register the Files-page script injection directly.
// appinfo/app.php is executed by Nextcloud on every request for active apps,
// making it more reliable than the IBootstrap lifecycle for this use case.
Server::get(IEventDispatcher::class)->addListener(
    LoadAdditionalScriptsEvent::class,
    static function (): void {
        Util::addScript('simpletexteditor', 'editor-bundle');
    }
);
