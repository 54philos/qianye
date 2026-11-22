using System;
using System.IO;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using System.Security.Principal;
using System.Web.Script.Serialization;
using System.Text;
using System.Text.RegularExpressions;
public sealed class WinELauncher : NativeWindow {
 const int WM_HOTKEY=0x312, WM_LAUNCH=0x8001, Id=0x5745;
 delegate IntPtr KeyboardCallback(int code,IntPtr message,IntPtr data);
 [DllImport("user32.dll",SetLastError=true)]static extern bool RegisterHotKey(IntPtr hwnd,int id,uint modifiers,uint key);
 [DllImport("user32.dll")]static extern bool UnregisterHotKey(IntPtr hwnd,int id);
 [DllImport("user32.dll",SetLastError=true)]static extern IntPtr SetWindowsHookEx(int type,KeyboardCallback callback,IntPtr module,uint thread);
 [DllImport("user32.dll")]static extern bool UnhookWindowsHookEx(IntPtr hook);
 [DllImport("user32.dll")]static extern IntPtr CallNextHookEx(IntPtr hook,int code,IntPtr message,IntPtr data);
 [DllImport("user32.dll")]static extern short GetAsyncKeyState(int key);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern IntPtr GetModuleHandle(string module);
 [DllImport("user32.dll")]static extern bool PostMessage(IntPtr hwnd,int message,IntPtr wparam,IntPtr lparam);
 [DllImport("user32.dll")]static extern void keybd_event(byte key,byte scan,uint flags,UIntPtr extra);
 [StructLayout(LayoutKind.Sequential)]struct CopyData {public IntPtr data;public int bytes;public IntPtr text;}
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]static extern IntPtr FindWindowEx(IntPtr parent,IntPtr after,string className,string title);
 [DllImport("user32.dll")]static extern bool IsWindowVisible(IntPtr hwnd);
 [DllImport("user32.dll")]static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint pid);
 [DllImport("kernel32.dll")]static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll",CharSet=CharSet.Unicode)]static extern bool QueryFullProcessImageName(IntPtr process,uint flags,StringBuilder name,ref int length);
 [DllImport("kernel32.dll")]static extern bool CloseHandle(IntPtr handle);
 [DllImport("user32.dll")]static extern bool AllowSetForegroundWindow(uint pid);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]static extern IntPtr SendMessageTimeout(IntPtr hwnd,uint message,IntPtr wparam,ref CopyData data,uint flags,uint timeout,out UIntPtr result);
 readonly object launchGate=new object();
 readonly string app,report;bool registered,eHeld;IntPtr hook;KeyboardCallback callback;int count;
 public WinELauncher(){string root=AppDomain.CurrentDomain.BaseDirectory;app=Path.GetFullPath(Path.Combine(root,"..","..","TE64.exe"));report=Path.GetFullPath(Path.Combine(root,"..","..","config","wine-hotkey-status.json"));}
 void Save(string action,int error){File.WriteAllText(report,new JavaScriptSerializer().Serialize(new{active=registered||hook!=IntPtr.Zero,mode=registered?"RegisterHotKey":"WinE-only keyboard hook",pid=Process.GetCurrentProcess().Id,action=action,error=error,triggerCount=count,target=app,utc=DateTime.UtcNow.ToString("o")}));}
 static bool Down(int key){return (GetAsyncKeyState(key)&0x8000)!=0;}
 public static bool Match(int key,bool win,bool ctrl,bool alt,bool shift){return key==0x45&&win&&!ctrl&&!alt&&!shift;}
 IntPtr OnKey(int code,IntPtr message,IntPtr data){
  if(code>=0){int key=Marshal.ReadInt32(data),msg=message.ToInt32();bool down=msg==0x100||msg==0x104,up=msg==0x101||msg==0x105;
   if(key==0x45){
    if(down&&Match(key,Down(0x5B)||Down(0x5C),Down(0x11),Down(0x12),Down(0x10))){
     if(!eHeld){eHeld=true;keybd_event(0xE8,0,0,UIntPtr.Zero);keybd_event(0xE8,0,2,UIntPtr.Zero);PostMessage(Handle,WM_LAUNCH,IntPtr.Zero,IntPtr.Zero);}return new IntPtr(1);
    }
    if(up&&eHeld){eHeld=false;return new IntPtr(1);}
   }
  }
  return CallNextHookEx(hook,code,message,data);
 }
 static string Quote(string text){var result=new StringBuilder("\"");int slashes=0;foreach(char ch in text){if(ch=='\\'){slashes++;continue;}if(ch=='\"'){result.Append('\\',slashes*2+1);result.Append(ch);}else{result.Append('\\',slashes);result.Append(ch);}slashes=0;}result.Append('\\',slashes*2);result.Append('"');return result.ToString();}
 bool Dispatch(string path){
  IntPtr window=IntPtr.Zero,resident=IntPtr.Zero;
  try { var data=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(Path.Combine(Path.GetDirectoryName(report),"finder-resident-target.json"))); if(data.ContainsKey("active")&&Convert.ToBoolean(data["active"]))resident=new IntPtr(Convert.ToInt64(data["hwnd"])); } catch {}
  while((window=FindWindowEx(IntPtr.Zero,window,"TablacusExplorer",null))!=IntPtr.Zero){
   if(!IsWindowVisible(window)&&window!=resident)continue;
   uint pid;GetWindowThreadProcessId(window,out pid);IntPtr process=OpenProcess(0x1000,false,pid);if(process==IntPtr.Zero)continue;
   var name=new StringBuilder(2048);int length=name.Capacity;bool match;
   try{match=QueryFullProcessImageName(process,0,name,ref length)&&String.Equals(name.ToString(),app,StringComparison.OrdinalIgnoreCase);}finally{CloseHandle(process);}
   if(!match)continue;
   string command=Quote(app)+" "+Quote(path);IntPtr text=Marshal.StringToHGlobalUni(command);
   try{var data=new CopyData{data=new IntPtr(0x4645),bytes=(command.Length+1)*2,text=text};UIntPtr result;AllowSetForegroundWindow(pid);if(SendMessageTimeout(window,0x4A,new IntPtr(1),ref data,2,1000,out result)!=IntPtr.Zero&&result==UIntPtr.Zero)return true;}finally{Marshal.FreeHGlobal(text);}
  }
  return false;
 }
 public string Launch(string path){string method;if(Dispatch(path)){method="same-instance IPC";}else{Process.Start(new ProcessStartInfo(app,Quote(path)){UseShellExecute=true});method="start Tablacus";}count++;return method;}
 public string StartupPath(){
  const string fallback="::{20D04FE0-3AEA-1069-A2D8-08002B30309D}";
  try{var data=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(Path.Combine(Path.GetDirectoryName(report),"finder-startup.json")));object value;string path;
   if(data.TryGetValue("path",out value)&&(path=value as string)!=null&&Regex.IsMatch(path,@"^(?:[a-z]:\\|\\\\[^\\]+\\[^\\]+|::\{20D04FE0-3AEA-1069-A2D8-08002B30309D\})",RegexOptions.IgnoreCase)&&path.IndexOfAny(new[]{'\r','\n','\0'})<0)return path;
  }catch{}return fallback;
 }
 public void Launch(){Launch(StartupPath());}
 public bool Start(){
  CreateHandle(new CreateParams{Caption="Tablacus Win+E",Parent=new IntPtr(-3)});
  registered=RegisterHotKey(Handle,Id,0x4008,0x45);
  if(!registered){callback=OnKey;hook=SetWindowsHookEx(13,callback,GetModuleHandle(null),0);}
  bool active=registered||hook!=IntPtr.Zero;Save("started",active?0:Marshal.GetLastWin32Error());return active;
 }
 protected override void WndProc(ref Message message){if((message.Msg==WM_HOTKEY&&message.WParam.ToInt32()==Id)||message.Msg==WM_LAUNCH){ThreadPool.QueueUserWorkItem(delegate{lock(launchGate){try{Launch();Save("launched",0);}catch(Exception e){Save(e.Message,e.HResult);}}});return;}base.WndProc(ref message);}
 public void Stop(){if(registered)UnregisterHotKey(Handle,Id);if(hook!=IntPtr.Zero)UnhookWindowsHookEx(hook);DestroyHandle();}
 [STAThread]public static int Main(string[] args){try{
  var launcher=new WinELauncher();
  if(args.Length>0&&(args[0]=="--launch"||args[0]=="--folder")){
   string path=args[0]=="--folder"&&args.Length>1?args[1]:launcher.StartupPath();
   if(path.Length==3&&Char.IsLetter(path[0])&&path[1]==':'&&path[2]=='\"')path=path.Substring(0,2)+"\\";
   string method=launcher.Launch(path);File.WriteAllText(Path.Combine(Path.GetDirectoryName(launcher.report),"wine-launch-test.json"),new JavaScriptSerializer().Serialize(new{launched=true,target=launcher.app,path=path,method=method,utc=DateTime.UtcNow.ToString("o")}));return 0;}
  if(args.Length>0&&args[0]=="--self-test"){bool passed=Match(0x45,true,false,false,false)&&!Match(0x45,false,false,false,false)&&!Match(0x45,true,true,false,false)&&!Match(0x45,true,false,true,false)&&!Match(0x45,true,false,false,true)&&!Match(0x46,true,false,false,false);File.WriteAllText(Path.Combine(Path.GetDirectoryName(launcher.report),"wine-hotkey-selftest.json"),"{\"passed\":"+(passed?"true":"false")+"}");return passed?0:1;}
  bool owner;using(var mutex=new Mutex(true,"Local\\Tablacus.WinE."+WindowsIdentity.GetCurrent().User.Value,out owner)){if(!owner)return 0;if(!launcher.Start())return 1;try{Application.Run();}finally{launcher.Stop();}}return 0;
 }catch{return 2;}}
}


