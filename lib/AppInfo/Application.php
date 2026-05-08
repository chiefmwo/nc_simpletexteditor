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
        // Register the files-plugin script via the modern IBootstrap path.
        // appinfo/app.php registers the same listener as a fallback for
        // older NC versions where IBootstrap dispatch was unreliable.
        // Util::addScript dedupes, so a duplicate registration is harmless.
        $context->registerEventListener(
            LoadAdditionalScriptsEvent::class,
            LoadAdditionalScriptsListener::class
        );
    }

    public function boot(IBootContext $context): void {
    }
}
