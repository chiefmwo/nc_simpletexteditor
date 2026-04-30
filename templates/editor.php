<?php
/**
 * Editor template – rendered with TemplateResponse render type 'blank'
 * so we get a full-page, navigation-free editing experience.
 *
 * @var array $_ Variables from EditorController::index()
 */

// All values are escaped at the assignment site so every echo below is safe.
$fileId   = isset($_['fileId'])   ? (int)$_['fileId']   : 0;
$fileName = isset($_['fileName']) ? htmlspecialchars($_['fileName'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : '';
$error    = isset($_['error'])    ? htmlspecialchars($_['error'],    ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : '';
$loadUrl  = isset($_['loadUrl'])  ? htmlspecialchars($_['loadUrl'],  ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : '';
$saveUrl  = isset($_['saveUrl'])  ? htmlspecialchars($_['saveUrl'],  ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : '';
$cssUrl   = isset($_['cssUrl'])   ? htmlspecialchars($_['cssUrl'],   ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : '';
$jsUrl    = isset($_['jsUrl'])    ? htmlspecialchars($_['jsUrl'],    ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : '';
$token    = isset($_['token'])    ? htmlspecialchars($_['token'],    ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') : '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo $fileName; ?> – Simple Text Editor</title>
    <?php if ($cssUrl !== ''): ?>
    <link rel="stylesheet" href="<?php echo $cssUrl; ?>">
    <?php endif; ?>
</head>
<body class="ste-body">

<?php if ($error !== ''): ?>
<div class="ste-error"><?php echo $error; ?></div>
<?php else: ?>

<div id="ste-app"
     data-file-id="<?php echo $fileId; ?>"
     data-file-name="<?php echo $fileName; ?>"
     data-load-url="<?php echo $loadUrl; ?>"
     data-save-url="<?php echo $saveUrl; ?>"
     data-request-token="<?php echo $token; ?>"
></div>

<?php endif; ?>

<?php if ($jsUrl !== ''): ?>
<script src="<?php echo $jsUrl; ?>"></script>
<?php endif; ?>

</body>
</html>
