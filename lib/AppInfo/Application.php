<?php

declare(strict_types=1);

namespace OCA\SimpleTextEditor\AppInfo;

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCA\SimpleTextEditor\Listener\LoadAdditionalScriptsListener;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;

class Application extends App implements IBootstrap {

    public const APP_ID = 'simpletexteditor';

    public function __construct() {
        parent::__construct(self::APP_ID);
    }

    public function register(IRegistrationContext $context): void {
        // Load our JS bundle whenever the Files app renders its file list,
        // so the context-menu action is registered via the event bus.
        $context->registerEventListener(
            LoadAdditionalScriptsEvent::class,
            LoadAdditionalScriptsListener::class
        );
    }

    public function boot(IBootContext $context): void {
        // Nothing to do at boot time.
    }
}
