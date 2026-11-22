#define ProductName "千页文件管理器"
#define ProductVersion "1.0.0"
[Setup]
AppId={{17000E25-2E25-4C42-A98A-7F65EC69EDBA}
AppName={#ProductName}
AppVersion={#ProductVersion}
AppPublisher=千页项目（基于 Tablacus Explorer）
AppPublisherURL=https://github.com/54philos/qianye
AppSupportURL=https://github.com/54philos/qianye/issues
DefaultDirName={localappdata}\Programs\Qianye
DefaultGroupName=千页
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0.17763
DisableProgramGroupPage=yes
DisableWelcomePage=no
WizardStyle=modern
SetupIconFile=..\app\addons\finderstyle\finder-classic-fuller.ico
UninstallDisplayIcon={app}\addons\finderstyle\finder-classic-fuller.ico
UninstallDisplayName={#ProductName}
OutputDir=..\dist
OutputBaseFilename=Qianye-Setup-1.0.0-Win10-Win11-x64
Compression=lzma2/max
SolidCompression=yes
CloseApplications=yes
RestartApplications=no
InfoBeforeFile=..\app\使用说明.txt
LicenseFile=..\app\LICENSE-Tablacus.txt
ChangesAssociations=yes
VersionInfoVersion=1.0.0.0
VersionInfoDescription=Qianye tabbed file manager

[Languages]
Name: "chinesesimp"; MessagesFile: "ChineseSimplified.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: desktop; Description: "创建桌面快捷方式"; GroupDescription: "快捷方式："
Name: folders; Description: "使用本软件打开文件夹和磁盘（仅当前用户）"; GroupDescription: "可选接管："; Flags: unchecked
Name: wine; Description: "让 Win+E 打开本软件，并在登录时启动快捷键程序"; GroupDescription: "可选接管："; Flags: unchecked

[Files]
Source: "..\app\*"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\app\addons\*"; DestDir: "{app}\addons"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\app\lib\*"; DestDir: "{app}\lib"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\app\script\*"; DestDir: "{app}\script"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\app\lang\*"; DestDir: "{app}\lang"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\app\init\*"; DestDir: "{app}\init"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\app\layout\*"; DestDir: "{app}\layout"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\app\config\*"; DestDir: "{app}\config"; Flags: onlyifdoesntexist uninsneveruninstall
Source: "downloads\MicrosoftEdgeWebview2Setup.exe"; Flags: dontcopy

[Icons]
Name: "{group}\千页"; Filename: "{app}\TE64.exe"; WorkingDir: "{app}"; IconFilename: "{app}\addons\finderstyle\finder-classic-fuller.ico"
Name: "{group}\使用说明"; Filename: "{app}\使用说明.txt"
Name: "{group}\卸载 千页"; Filename: "{uninstallexe}"
Name: "{userdesktop}\千页"; Filename: "{app}\TE64.exe"; WorkingDir: "{app}"; IconFilename: "{app}\addons\finderstyle\finder-classic-fuller.ico"; Tasks: desktop

[Run]
Filename: "{app}\addons\finderstyle\wine-launcher.exe"; Tasks: wine; Flags: nowait runhidden; Check: NotTestMode
Filename: "{app}\TE64.exe"; Description: "打开 千页"; Flags: postinstall nowait skipifsilent

[Code]
const
  Verb = 'TablacusFinder.Open';
  StateRoot = 'Software\TablacusFinder\Integration';
  SelfTestRoot = 'Software\TablacusFinder\IntegrationSelfTest';
var
  TestMode: Boolean;

function NotTestMode(): Boolean;
begin Result := not TestMode; end;

function ClassRoot(): String;
begin
  if TestMode then Result := SelfTestRoot + '\Classes' else Result := 'Software\Classes';
end;

function RunRoot(): String;
begin
  if TestMode then Result := SelfTestRoot + '\Run' else Result := 'Software\Microsoft\Windows\CurrentVersion\Run';
end;

function BackupRoot(): String;
begin
  if TestMode then Result := SelfTestRoot + '\Backup' else Result := StateRoot;
end;

function FolderCommand(): String;
begin Result := '"' + ExpandConstant('{app}\addons\finderstyle\wine-launcher.exe') + '" --folder "%1"'; end;

function HotkeyCommand(): String;
begin Result := '"' + ExpandConstant('{app}\addons\finderstyle\wine-launcher.exe') + '"'; end;

procedure EnableClass(ClassName: String);
var K, B, Old, Cmd: String; Saved: Cardinal; Present: Boolean;
begin
  K := ClassRoot() + '\' + ClassName + '\shell';
  B := BackupRoot() + '\' + ClassName;
  if not RegQueryDWordValue(HKCU, B, 'Saved', Saved) then begin
    Present := RegQueryStringValue(HKCU, K, '', Old);
    RegWriteDWordValue(HKCU, B, 'HadDefault', Ord(Present));
    if Present then RegWriteStringValue(HKCU, B, 'PreviousDefault', Old);
    RegWriteDWordValue(HKCU, B, 'Saved', 1);
  end;
  Cmd := FolderCommand();
  if not RegWriteStringValue(HKCU, K + '\' + Verb, '', '使用 千页 打开') then RaiseException('无法注册文件夹打开操作。');
  RegWriteStringValue(HKCU, K + '\' + Verb, 'Icon', ExpandConstant('{app}\addons\finderstyle\finder-classic-fuller.ico,0'));
  RegWriteStringValue(HKCU, K + '\' + Verb + '\command', '', Cmd);
  if not RegWriteStringValue(HKCU, K, '', Verb) then RaiseException('无法设置文件夹默认操作。');
end;

procedure RestoreClass(ClassName: String);
var K, B, Current, Cmd, Old: String; Had: Cardinal;
begin
  K := ClassRoot() + '\' + ClassName + '\shell'; B := BackupRoot() + '\' + ClassName;
  if RegQueryStringValue(HKCU, K + '\' + Verb + '\command', '', Cmd) and (CompareText(Cmd, FolderCommand()) = 0) then begin
    if RegQueryStringValue(HKCU, K, '', Current) and (Current = Verb) then begin
      if RegQueryDWordValue(HKCU, B, 'HadDefault', Had) and (Had = 1) then begin
        if RegQueryStringValue(HKCU, B, 'PreviousDefault', Old) then RegWriteStringValue(HKCU, K, '', Old);
      end else RegDeleteValue(HKCU, K, '');
    end;
    RegDeleteKeyIncludingSubkeys(HKCU, K + '\' + Verb);
    RegDeleteKeyIncludingSubkeys(HKCU, B);
  end;
end;

procedure EnableHotkey();
var B, Old: String; Saved: Cardinal; Present: Boolean;
begin
 B := BackupRoot() + '\WinE';
 if not RegQueryDWordValue(HKCU, B, 'Saved', Saved) then begin
   Present := RegQueryStringValue(HKCU, RunRoot(), 'TablacusFinderWinE', Old);
   RegWriteDWordValue(HKCU, B, 'HadValue', Ord(Present));
   if Present then RegWriteStringValue(HKCU, B, 'PreviousValue', Old);
   RegWriteDWordValue(HKCU, B, 'Saved', 1);
 end;
 if not RegWriteStringValue(HKCU, RunRoot(), 'TablacusFinderWinE', HotkeyCommand()) then RaiseException('无法设置 Win+E 登录启动。');
end;

procedure RestoreHotkey();
var B, Current, Old: String; Had: Cardinal;
begin
 B := BackupRoot() + '\WinE';
 if RegQueryStringValue(HKCU, RunRoot(), 'TablacusFinderWinE', Current) and (CompareText(Current, HotkeyCommand()) = 0) then begin
   if RegQueryDWordValue(HKCU, B, 'HadValue', Had) and (Had = 1) then begin
     if RegQueryStringValue(HKCU, B, 'PreviousValue', Old) then RegWriteStringValue(HKCU, RunRoot(), 'TablacusFinderWinE', Old);
   end else RegDeleteValue(HKCU, RunRoot(), 'TablacusFinderWinE');
   RegDeleteKeyIncludingSubkeys(HKCU, B);
 end;
end;

function WebViewInstalled(): Boolean;
var V: String; K: String;
begin
 K := 'Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';
 Result := (RegQueryStringValue(HKLM32,K,'pv',V) and (V<>'') and (V<>'0.0.0.0')) or
           (RegQueryStringValue(HKLM64,K,'pv',V) and (V<>'') and (V<>'0.0.0.0')) or
           (RegQueryStringValue(HKCU32,K,'pv',V) and (V<>'') and (V<>'0.0.0.0')) or
           (RegQueryStringValue(HKCU64,K,'pv',V) and (V<>'') and (V<>'0.0.0.0'));
end;

function InitializeSetup(): Boolean;
begin
 TestMode := ExpandConstant('{param:IntegrationTest|0}') = '1';
 Result := True;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var Code: Integer; Tool: String;
begin
 Result := '';
 Tool := ExpandConstant('{app}\Maintenance.exe');
 if FileExists(Tool) then begin
   if not Exec(Tool,'--stop',ExpandConstant('{app}'),SW_HIDE,ewWaitUntilTerminated,Code) or (Code<>0) then begin Result := '请从本软件托盘菜单选择“彻底退出”，然后重试安装。'; Exit; end;
 end;
 if not WebViewInstalled() then begin
   WizardForm.StatusLabel.Caption := '正在安装 Microsoft Edge WebView2 Runtime（需要联网）…';
   ExtractTemporaryFile('MicrosoftEdgeWebview2Setup.exe');
   if not Exec(ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe'),'/silent /install','',SW_HIDE,ewWaitUntilTerminated,Code) or not WebViewInstalled() then
     Result := '未能安装 WebView2 Runtime。请联网后重试，或先从微软官方网站安装 WebView2 Runtime。';
 end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var Code: Integer;
begin
 if CurStep = ssPostInstall then begin
   if not Exec(ExpandConstant('{app}\Maintenance.exe'),'--seed',ExpandConstant('{app}'),SW_HIDE,ewWaitUntilTerminated,Code) or (Code<>0) then RaiseException('默认收藏夹初始化失败，请查看安装目录 maintenance-error.txt。');
   if TestMode then SaveStringToFile(ExpandConstant('{app}\.integration-test'),'1',False);
   if WizardIsTaskSelected('folders') then begin EnableClass('Directory'); EnableClass('Drive'); end;
   if WizardIsTaskSelected('wine') then EnableHotkey();
 end;
end;

function InitializeUninstall(): Boolean;
var Tool: String; Code: Integer;
begin
 TestMode := FileExists(ExpandConstant('{app}\.integration-test'));
 Tool := ExpandConstant('{app}\Maintenance.exe'); Result := True;
 if FileExists(Tool) then
   if not Exec(Tool,'--stop',ExpandConstant('{app}'),SW_HIDE,ewWaitUntilTerminated,Code) or (Code<>0) then begin
     MsgBox('请先从本软件托盘菜单选择“彻底退出”，再运行卸载。',mbError,MB_OK); Result := False;
   end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
 if CurUninstallStep = usUninstall then begin
   RestoreClass('Directory'); RestoreClass('Drive'); RestoreHotkey();
   DeleteFile(ExpandConstant('{app}\.integration-test'));
 end;
end;
