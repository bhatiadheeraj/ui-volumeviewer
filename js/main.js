/**
 * UI to display 
 */

'use strict';
$(function() {
    
    var config = {
        wf_api: '/api/wf',
        jwt: localStorage.getItem('jwt'),
        debug: true,
    };

    var url = new URL(window.location.href);
    var task_id = url.searchParams.get('task');
    var subdir = url.searchParams.get('sdir');

    if(config.debug) {
        task_id = "59838f6f841a822e8b3872e0";
        // subdir = "output";
        config.wf_api = "https://brainlife.duckdns.org/api/wf";
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
            viewer.loadDefaultColorMapFromURL('color_maps/gray_scale.txt', '#ff0000');
            
            //load t1 and pass it to volume viewer
            var base = task.instance_id + '/' + task._id;
            if (subdir) base += '/' + subdir;
            
            fetch(config.wf_api + "/resource/download?r=" + task.resource_id +
                  "&p="+encodeURIComponent(base+"/t1.nii.gz") +
                  "&at="+config.jwt)
            .then(res => res.arrayBuffer())
            .then(t1_buff => {
                // load the nifti from the downloaded array buffer
                viewer.loadVolumes({
                    volumes: [{
                        type: 'nifti1',
                        nii_url: URL.createObjectURL( new Blob([ pako.inflate(t1_buff) ]) )
                    }]
                });
            });
            
            // resize the display panels when the window is resized
            // commented out for now, maybe uncomment if we ever want this ui to look less shitty
            // function resized() {
            //     var view_element = document.getElementById("view");
            //     var width_on_three = window.innerWidth / 3;
                
            //     for (var i in view_element.children) {
            //         var container = view_element.children[0];
            //         if (!(container instanceof HTMLElement)) continue;
                    
            //         for (var j in container.children) {
            //             var canvas = container.children[j];
            //             if (!(canvas instanceof HTMLCanvasElement)) continue;
                        
            //             canvas.style.width = width_on_three + 'px';
            //             canvas.style.height = width_on_three + 'px';
            //         }
            //     }
            //     viewer.redrawVolumes();
            // }
            // viewer.addEventListener('volumesloaded', resized);
            // window.addEventListener('resize', resized);
            // resized();
            
            viewer.render();
        });
        
    }
    
});

