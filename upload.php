<?php
// upload.php
header("Content-Type: application/json");

// Base folder on server
$baseDir = __DIR__ . "/uploads/applications/";
$baseUrl = "/uploads/applications/";

// Validate request
if (!isset($_FILES["file"], $_POST["appId"], $_POST["label"])) {
  echo json_encode(["success" => false, "error" => "Invalid request"]);
  exit;
}

// Sanitize inputs
$appId = preg_replace("/[^a-zA-Z0-9]/", "", $_POST["appId"]);
$label = preg_replace("/[^a-zA-Z0-9]/", "", $_POST["label"]);

if (!$appId || !$label) {
  echo json_encode(["success" => false, "error" => "Invalid parameters"]);
  exit;
}

// Create target directory
$targetDir = $baseDir . $appId . "/" . $label . "/";
if (!is_dir($targetDir)) {
  mkdir($targetDir, 0755, true);
}

// File validation
$file = $_FILES["file"];
$ext = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
$allowed = ["pdf", "jpg", "jpeg", "png"];

if (!in_array($ext, $allowed)) {
  echo json_encode(["success" => false, "error" => "Invalid file type"]);
  exit;
}

// Optional size limit (5 MB)
if ($file["size"] > 5 * 1024 * 1024) {
  echo json_encode(["success" => false, "error" => "File too large"]);
  exit;
}

// Generate safe filename
$safeName = time() . "_" . preg_replace("/[^a-zA-Z0-9._-]/", "", $file["name"]);
$targetPath = $targetDir . $safeName;

// Move file
if (!move_uploaded_file($file["tmp_name"], $targetPath)) {
  echo json_encode(["success" => false, "error" => "Upload failed"]);
  exit;
}

// Success response (RETURN PATH ONLY)
echo json_encode([
  "success" => true,
  "path" => $baseUrl . $appId . "/" . $label . "/" . $safeName
]);
