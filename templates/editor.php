<?php
/**
 * Editor template – rendered with TemplateResponse render type 'blank'
 * so we get a full-page, navigation-free editing experience.
 *
 * @var array $_ Variables from EditorController::index()
 */

$fileId   = isset($_['fileId'])   ? (int)$_['fileId']   : 0;
$fileName = isset($_['fileName']) ? htmlspecialchars($_['fileName'], ENT_QUOTES) : '';
$error    = isset($_['error'])    ? htmlspecialchars($_['error'],    ENT_QUOTES) : '';
$loadUrl  = isset($_['loadUrl'])  ? $_['loadUrl']  : '';
$saveUrl  = isset($_['saveUrl'])  ? $_['saveUrl']  : '';
$cssUrl   = isset($_['cssUrl'])   ? $_['cssUrl']   : '';
$jsUrl    = isset($_['jsUrl'])    ? $_['jsUrl']    : '';
$token    = isset($_['token'])    ? $_['token']    : '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?php echo $fileName; ?> – Simple Text Editor</title>
    <?php if ($cssUrl): ?>
    <link rel="stylesheet" href="<?php echo htmlspecialchars($cssUrl, ENT_QUOTES); ?>">
    <?php endif; ?>
</head>
<body class="ste-body">

<?php if ($error !== ''): ?>
<div class="ste-error"><?php echo $error; ?></div>
<?php else: ?>

<div id="ste-app"
     data-file-id="<?php echo $fileId; ?>"
     data-file-name="<?php echo $fileName; ?>"
     data-load-url="<?php echo htmlspecialchars($loadUrl, ENT_QUOTES); ?>"
     data-save-url="<?php echo htmlspecialchars($saveUrl, ENT_QUOTES); ?>"
     data-request-token="<?php echo htmlspecialchars($token, ENT_QUOTES); ?>"
></div>

<?php endif; ?>

<?php if ($jsUrl): ?>
<script src="<?php echo htmlspecialchars($jsUrl, ENT_QUOTES); ?>"></script>
<?php endif; ?>

</body>
</html>
