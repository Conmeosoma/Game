package vn.personal.dmcoffline;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.view.View;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private WebView web;
    private SharedPreferences prefs;
    private String pendingExport;
    private static final int EXPORT = 41, IMPORT = 42, LIMIT = 2000000;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        prefs=getSharedPreferences("progress", MODE_PRIVATE);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        web=new WebView(this);
        web.setBackgroundColor(Color.rgb(33,27,23));
        WebSettings s=web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setBlockNetworkLoads(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        if((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE)!=0)WebView.setWebContentsDebuggingEnabled(true);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest r){return true;}
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url){return true;}
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onConsoleMessage(ConsoleMessage m){android.util.Log.d("DMCWeb",m.message()+" @"+m.lineNumber());return true;}
        });
        web.addJavascriptInterface(new SaveBridge(),"Android");
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }
    public class SaveBridge {
        @JavascriptInterface public String load(){return prefs.getString("save","");}
        @JavascriptInterface public synchronized boolean save(String raw){
            if(raw==null || raw.length()>LIMIT)return false;
            try {
                JSONObject data=new JSONObject(raw);
                if(data.getInt("version")!=1)return false;
                String old=prefs.getString("save","");
                SharedPreferences.Editor edit=prefs.edit();
                if(!old.isEmpty())edit.putString("previous",old);
                return edit.putString("save",raw).commit();
            } catch(Exception e){return false;}
        }
        @JavascriptInterface public void exportSave(final String raw){runOnUiThread(()->{
            if(raw==null || raw.length()>LIMIT){message("Bản lưu quá lớn.");return;}
            pendingExport=raw;
            Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("application/json");
            i.putExtra(Intent.EXTRA_TITLE,"dmc-offline-save-"+System.currentTimeMillis()+".json");
            try{startActivityForResult(i,EXPORT);}catch(Exception e){message("Không mở được trình lưu tệp.");}
        });}
        @JavascriptInterface public void importSave(){runOnUiThread(()->{
            Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");
            try{startActivityForResult(i,IMPORT);}catch(Exception e){message("Không mở được trình chọn tệp.");}
        });}
        @JavascriptInterface public void leave(){runOnUiThread(()->moveTaskToBack(true));}
    }
    private void message(String s){Toast.makeText(this,s,Toast.LENGTH_LONG).show();}
    @Override public void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);if(pendingExport!=null)out.putString("pendingExport",pendingExport);}
    @Override public void onRestoreInstanceState(Bundle in){super.onRestoreInstanceState(in);pendingExport=in.getString("pendingExport");}
    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);
        if(result!=RESULT_OK || data==null || data.getData()==null)return;
        Uri uri=data.getData();
        try {
            if(request==EXPORT && pendingExport!=null){
                try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){
                    if(out==null)throw new Exception("Không ghi được tệp.");
                    out.write(pendingExport.getBytes(StandardCharsets.UTF_8));
                }
                pendingExport=null;message("Đã xuất bản lưu.");
            }else if(request==IMPORT){
                String raw;
                try(InputStream in=getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){
                    if(in==null)throw new Exception("Không đọc được tệp.");
                    byte[] buf=new byte[8192];int n;
                    while((n=in.read(buf))!=-1){if(out.size()+n>LIMIT)throw new Exception("Bản lưu quá lớn.");out.write(buf,0,n);}
                    raw=new String(out.toByteArray(),StandardCharsets.UTF_8);
                }
                web.evaluateJavascript("window.importGame("+JSONObject.quote(raw)+")",null);
            }
        }catch(Exception e){message("Lỗi tệp: "+e.getMessage());}
    }
    @Override public void onBackPressed(){web.evaluateJavascript("window.handleBack && window.handleBack()",null);}
    @Override protected void onPause(){super.onPause();web.onPause();web.pauseTimers();}
    @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.resumeTimers();}}
    @Override protected void onDestroy(){if(web!=null){web.removeJavascriptInterface("Android");web.destroy();}super.onDestroy();}
}
