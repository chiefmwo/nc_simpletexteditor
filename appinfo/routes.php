<?php

declare(strict_types=1);

return [
    'routes' => [
        // HTML editor view
        [
            'name'    => 'editor#index',
            'url'     => '/edit/{fileId}',
            'verb'    => 'GET',
        ],
        // API: read file content
        [
            'name'    => 'editor#getFile',
            'url'     => '/api/file/{fileId}',
            'verb'    => 'GET',
        ],
        // API: write file content
        [
            'name'    => 'editor#saveFile',
            'url'     => '/api/file/{fileId}',
            'verb'    => 'PUT',
        ],
    ],
];
