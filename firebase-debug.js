// Firebase Debug Helper - Remove in production
// Add ?debug=1 to URL to see Firebase status
(function() {
  if (location.search.includes('debug=1')) {
    window.addEventListener('load', function() {
      setTimeout(function() {
        var status = {
          sdk: typeof firebase !== 'undefined',
          config: typeof FIREBASE_CONFIG !== 'undefined',
          db: !!window.db,
          projectId: typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG.projectId : 'N/A'
        };
        var div = document.createElement('div');
        div.style.cssText = 'position:fixed;bottom:80px;left:10px;background:#000;color:#0f0;font-family:monospace;font-size:11px;padding:10px;z-index:99999;border:1px solid #0f0;border-radius:4px;';
        div.innerHTML = '🔥 Firebase Debug<br>' + 
          'SDK: ' + (status.sdk ? '✅' : '❌') + '<br>' +
          'Config: ' + (status.config ? '✅' : '❌') + '<br>' +
          'DB: ' + (status.db ? '✅' : '❌') + '<br>' +
          'Project: ' + status.projectId;
        document.body.appendChild(div);
        
        // Test a Firestore read
        if (window.db) {
          window.db.collection('polls').limit(1).get().then(function(s) {
            div.innerHTML += '<br>Read test: ✅ (' + s.size + ' docs)';
          }).catch(function(e) {
            div.innerHTML += '<br>Read test: ❌<br>' + e.message;
          });
        }
      }, 2000);
    });
  }
})();
