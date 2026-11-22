using System;
using System.IO;
using System.Xml;
using System.Text;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;
using System.Collections.Generic;
public static class Maintenance {
 [DllImport("shell32.dll")] static extern int SHGetKnownFolderPath(ref Guid id,uint flags,IntPtr token,out IntPtr path);
 [DllImport("ole32.dll")] static extern void CoTaskMemFree(IntPtr ptr);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr hwnd,StringBuilder text,int max);
 [StructLayout(LayoutKind.Sequential)] struct CopyData {public IntPtr data;public int bytes;public IntPtr text;}
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr SendMessageTimeout(IntPtr hwnd,uint msg,IntPtr wp,ref CopyData data,uint flags,uint timeout,out UIntPtr result);
 static string Root {get{return AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);}}
 static string Known(string id) {Guid g=new Guid(id);IntPtr p;int hr=SHGetKnownFolderPath(ref g,0,IntPtr.Zero,out p);if(hr!=0)Marshal.ThrowExceptionForHR(hr);try{return Marshal.PtrToStringUni(p);}finally{CoTaskMemFree(p);}}
 static Dictionary<string,string> Folders(){return new Dictionary<string,string>{{"Desktop",Known("B4BFCC3A-DB2C-424C-B029-7FE99A87C641")},{"Downloads",Known("374DE290-123F-4565-9164-39C4925E467B")},{"Documents",Known("FDD39AD0-238F-46AF-ADB4-6C85480369C7")}};}
 static void Seed(){var folders=Folders();foreach(string file in new[]{"menus.xml","finder-top-favorites.xml"}){string p=Path.Combine(Root,"config",file);var doc=new XmlDocument();doc.Load(p);bool changed=false;foreach(XmlNode n in doc.SelectNodes("//Favorites/Item")){foreach(var f in folders)if(n.InnerText=="{known:"+f.Key+"}"){n.InnerText=f.Value;changed=true;break;}}if(changed)doc.Save(p);}}
 static bool Owned(Process p,string exe){try{return String.Equals(Path.GetFullPath(p.MainModule.FileName),Path.Combine(Root,exe),StringComparison.OrdinalIgnoreCase);}catch{return false;}}
 static int Stop(){
  foreach(var p in Process.GetProcessesByName("wine-launcher"))using(p){if(Owned(p,@"addons\finderstyle\wine-launcher.exe")){p.Kill();if(!p.WaitForExit(5000))return 1;}}
  foreach(var p in Process.GetProcessesByName("TE64"))using(p){if(!Owned(p,"TE64.exe"))continue;IntPtr hwnd=p.MainWindowHandle;if(hwnd==IntPtr.Zero){
    // A resident window is hidden; locate it using its own persisted marker.
    try{var marker=new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(Path.Combine(Root,@"config\finder-resident-target.json")));if(Convert.ToInt32(marker["pid"])==p.Id)hwnd=new IntPtr(Convert.ToInt64(marker["hwnd"]));}catch{}
   }
   var name=new StringBuilder(128);GetClassName(hwnd,name,name.Capacity);if(name.ToString()!="TablacusExplorer")return 1;
   string cmd="\""+Path.Combine(Root,"TE64.exe")+"\" \"JScript,Sync.FinderResident.Exit()\"";IntPtr str=Marshal.StringToHGlobalUni(cmd);
   try{var cd=new CopyData{bytes=(cmd.Length+1)*2,text=str};UIntPtr result;if(SendMessageTimeout(hwnd,0x4A,IntPtr.Zero,ref cd,2,2500,out result)==IntPtr.Zero)return 1;}finally{Marshal.FreeHGlobal(str);}
   if(!p.WaitForExit(8000))return 1;
  }return 0;
 }
 [STAThread] public static int Main(string[] args){try{
  if(args.Length==1&&args[0]=="--seed"){Seed();return 0;}
  if(args.Length==1&&args[0]=="--stop")return Stop();
  if(args.Length==1&&args[0]=="--self-test"){
   var data=new{root=Root,folders=Folders(),core=File.Exists(Path.Combine(Root,"TE64.exe")),icon=File.Exists(Path.Combine(Root,@"addons\finderstyle\finder-classic-fuller.ico")),is64=Environment.Is64BitOperatingSystem};
   File.WriteAllText(Path.Combine(Root,"maintenance-selftest.json"),new JavaScriptSerializer().Serialize(data),Encoding.UTF8);return data.core&&data.icon&&data.is64?0:1;
  }return 2;
 }catch(Exception e){try{File.WriteAllText(Path.Combine(Root,"maintenance-error.txt"),e.ToString(),Encoding.UTF8);}catch{}return 3;}}
}
