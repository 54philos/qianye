using System;
using System.IO;
using System.Runtime.InteropServices;
namespace ThumbProbe {
[ComImport,Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] public interface IShellItem {
 void BindToHandler(IntPtr pbc,ref Guid bhid,ref Guid riid,out IntPtr ppv); void GetParent(out IShellItem ppsi); void GetDisplayName(uint sigdn,out IntPtr ppszName); void GetAttributes(uint sfgaoMask,out uint psfgaoAttribs); void Compare(IShellItem psi,uint hint,out int order);
}
[StructLayout(LayoutKind.Sequential)] public struct Size {public int cx,cy;}
[StructLayout(LayoutKind.Sequential)] public struct BitmapHeader {public uint size;public int width,height;public ushort planes,bits;public uint compression,imageSize;public int xppm,yppm;public uint used,important;}
[StructLayout(LayoutKind.Sequential)] public struct BitmapInfo {public BitmapHeader header;public uint colors;}
[ComImport,Guid("091162A4-BC96-411F-AAE8-C5122CD03363"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] public interface ISharedBitmap {
 [PreserveSig]int GetSharedBitmap(out IntPtr bitmap);[PreserveSig]int GetSize(out Size size);[PreserveSig]int GetFormat(out int alphaType);[PreserveSig]int InitializeBitmap(IntPtr bitmap,int alphaType);[PreserveSig]int Detach(out IntPtr bitmap);
}
[ComImport,Guid("F676C15D-596A-4CE2-8234-33996F445DB1"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] public interface IThumbnailCache {
 [PreserveSig]int GetThumbnail(IShellItem item,uint size,uint flags,out ISharedBitmap image,out uint cacheFlags,out Guid thumbnailId);
 [PreserveSig]int GetThumbnailByID(ref Guid thumbnailId,uint size,out ISharedBitmap image,out uint flags);
}
public class Result {public string path,hr,rawFile;public uint requestedSize,flags,cacheFlags;public int width,height,alphaType,transparentPixels,opaqueBlackPixels;public byte[] topLeft;}
public static class Probe {
 [DllImport("shell32.dll",CharSet=CharSet.Unicode,PreserveSig=true)]static extern int SHCreateItemFromParsingName(string path,IntPtr bind,ref Guid iid,out IShellItem item);
 [DllImport("gdi32.dll")]static extern IntPtr CreateCompatibleDC(IntPtr dc);
 [DllImport("gdi32.dll")]static extern bool DeleteDC(IntPtr dc);
 [DllImport("gdi32.dll")]static extern int GetDIBits(IntPtr dc,IntPtr bitmap,uint start,uint lines,byte[] bits,ref BitmapInfo info,uint usage);
 public static Result Read(string path,uint size,uint flags,string rawFile) {
  var r=new Result{path=path,requestedSize=size,flags=flags};IShellItem item=null;IThumbnailCache cache=null;ISharedBitmap image=null;
  try {var iid=new Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE");int hr=SHCreateItemFromParsingName(path,IntPtr.Zero,ref iid,out item);Marshal.ThrowExceptionForHR(hr);
   cache=(IThumbnailCache)Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("50EF4544-AC9F-4A8E-B21B-8A26180DB13F")));
   uint cf;Guid id;hr=cache.GetThumbnail(item,size,flags,out image,out cf,out id);r.hr="0x"+hr.ToString("X8");r.cacheFlags=cf;
   if(hr<0||image==null)return r;
   Size dim;int alpha;IntPtr bm;Marshal.ThrowExceptionForHR(image.GetSize(out dim));Marshal.ThrowExceptionForHR(image.GetFormat(out alpha));Marshal.ThrowExceptionForHR(image.GetSharedBitmap(out bm));
   r.width=dim.cx;r.height=dim.cy;r.alphaType=alpha;
   var bi=new BitmapInfo();bi.header.size=(uint)Marshal.SizeOf(typeof(BitmapHeader));bi.header.width=dim.cx;bi.header.height=-dim.cy;bi.header.planes=1;bi.header.bits=32;
   byte[] data=new byte[dim.cx*dim.cy*4];IntPtr dc=CreateCompatibleDC(IntPtr.Zero);try {if(GetDIBits(dc,bm,0,(uint)dim.cy,data,ref bi,0)==0)throw new Exception("GetDIBits failed");}finally{DeleteDC(dc);}
   r.topLeft=new byte[]{data[2],data[1],data[0],data[3]};
   for(int i=0;i<data.Length;i+=4){if(data[i+3]==0)r.transparentPixels++;if(data[i+3]>250&&data[i]<8&&data[i+1]<8&&data[i+2]<8)r.opaqueBlackPixels++;}
   if(!String.IsNullOrEmpty(rawFile)){File.WriteAllBytes(rawFile,data);r.rawFile=rawFile;}
  }finally{if(image!=null)Marshal.ReleaseComObject(image);if(cache!=null)Marshal.ReleaseComObject(cache);if(item!=null)Marshal.ReleaseComObject(item);}
  return r;
 }
}
}

