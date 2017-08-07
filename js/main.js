/**
 * UI to display output surface from Freesurfer using THREE.js
 */

'use strict';
$(function() {
    
    var config = {
        wf_api: '/api/wf',
        jwt: localStorage.getItem('jwt'),
        debug: true,
    };

    var url = new URL(window.location.href);
    var task_id = url.searchParams.get('free');
    var subdir = url.searchParams.get('sdir');

    if(config.debug) {
        task_id = "595fcb7c0f3f5d43e5bf2c95";
        subdir = "output";
        config.wf_api = "https://dev1.soichi.us/api/wf";
    }

    if (!config.jwt) {
        alert("Error: jwt not set");
        return;
    }
    
    //load task detail
    $.ajax({
        beforeSend: xhr => xhr.setRequestHeader('Authorization', 'Bearer '+config.jwt),
        url: config.wf_api+'/task',
        data: {
            find: JSON.stringify({ _id: task_id })
        },
        success: data => {
            init(data.tasks[0]);
        },
        error: console.error
    });
    
    function init(task) {
		BrainBrowser.VolumeViewer.start("view", function(viewer) {
			//load t1 and pass it to volume viewer
			console.log("todo", viewer);
		});
    }
});

