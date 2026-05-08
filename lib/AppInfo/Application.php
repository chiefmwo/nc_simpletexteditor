<?php

declare(strict_types=1);

namespace OCA\SimpleTextEditor\AppInfo;

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
        // Script injection for the Files page is handled in appinfo/app.php,
        // which runs reliably on every request for active apps.
    }

    public function boot(IBootContext $context): void {
    }
}
