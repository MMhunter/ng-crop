"use strict";

angular.module('ngCrop',[])

    .directive('ngCrop',function(){
        return{
            restrict:'E',
            scope:{
                img:'@',
                resultData:'=',
                width:"@",
                height:"@",
                maxWidth:"@",
                maxHeight:"@"
            },
            replace:true,
            template:'<div class="ng-crop" style="width:{{width}}px;height:{{height}}px"><canvas width="{{width}}px" height="{{height}}px" ng-class="{\'dragging\':canvasClass}"></canvas></div>',
            link:function($scope,iele,attrs){

                $scope.canvas = iele[0].getElementsByTagName('canvas')[0];
                $scope.context = $scope.canvas.getContext('2d');

                var sel = (function(){
                    return {
                        x:0,
                        y:0,
                        h:0,
                        w:0,
                        clear:function(){
                            this.x = 0;
                            this.y = 0;
                            this.h = 0;
                            this.w = 0;
                        }
                    }
                })();


                var tempImg  = new Image();
                var moveType = 'notMoving';
                var delX = 0;
                var delY = 0;
                var c2IRatio = 0;


                $scope.canvas.addEventListener('mousedown', mouseDown);
                $scope.canvas.addEventListener('mousemove', mouseMove);
                $scope.canvas.addEventListener('mouseup', mouseUp);
                $scope.canvas.addEventListener('mouseout', mouseUp);
                document.addEventListener('keydown', keyDown);
                document.addEventListener('keyup', keyUp);

                $scope.$on("$destroy",function(){
                    document.removeEventListener('keydown', keyDown);
                    document.removeEventListener('keyup', keyUp);
                });

                //load-image
                $scope.$watch('img',function(){
                    if(typeof $scope.img != 'undefined'){
                        tempImg.onload = function(){
                            if(typeof $scope.width === 'undefined' || typeof $scope.height === 'undefined'){
                                $scope.width = tempImg.width;
                                $scope.height = tempImg.height;
                                c2IRatio = 1;
                            }
                            else {
                                var ratio = tempImg.height / tempImg.width;
                                if (ratio > $scope.height / $scope.width) {
                                    var destWidth = $scope.canvas.height / ratio;
                                    $scope.canvas.width = destWidth;
                                    var destHeight = $scope.canvas.height;
                                    c2IRatio = tempImg.height / $scope.canvas.height;
                                }
                                else {
                                    var destHeight = $scope.canvas.width * ratio;
                                    var destWidth = $scope.canvas.width;
                                    $scope.canvas.height = destHeight;
                                    c2IRatio = tempImg.width / $scope.canvas.width;
                                }
                            }
                            startSelection();
                            outPutImg();


                        };

                        if(typeof $scope.img == 'bolb' ){
                            var reader = new FileReader();
                            reader.readAsDataURL($scope.img);
                            reader.onload = function(e){
                                tempImg.src = e.target.result;
                            };
                        }
                        else{
                            tempImg.src = $scope.img;
                        }
                    }
                    else{
                        $scope.canvas.width = $scope.width;
                        $scope.canvas.height = $scope.height;
                    }
                });

                function startSelection(){
                    sel.clear();
                    if(!$scope.square){
                        if(c2IRatio !== 1) {
                            sel.w = $scope.canvas.width*0.8;
                            sel.h = $scope.canvas.height*0.8;
                        }else{
                            sel.w = tempImg.width*0.8;
                            sel.h = tempImg.height*0.8;
                        }
                    }
                    else{
                        if($scope.canvas.height>50 && $scope.canvas.width>50 ) {
                            sel.w = 50;
                            sel.h = 50;
                        }
                        else{
                            if($scope.canvas.height < 50){
                                sel.w =  $scope.canvas.height;
                                sel.h = $scope.canvas.height;
                            }
                            else{
                                sel.w =  $scope.canvas.width;
                                sel.h = $scope.canvas.width;
                            }
                        }
                    }
                    drawSel();
                }

                function drawSel(){
                    $scope.context.clearRect(0,0, $scope.canvas.width,$scope.canvas.height);
                    $scope.context.globalAlpha  = 0.3;
                    $scope.context.drawImage(tempImg,0,0,tempImg.width,tempImg.height,0,0, $scope.canvas.width,$scope.canvas.height);
                    $scope.context.save();
                    $scope.context.beginPath();
                    $scope.context.rect(sel.x,sel.y,sel.w,sel.h);
                    $scope.context.closePath();
                    $scope.context.clip();
                    $scope.context.globalAlpha  = 1;
                    $scope.context.drawImage(tempImg,0,0,tempImg.width,tempImg.height,0,0,$scope.canvas.width,$scope.canvas.height);
                    $scope.context.restore();
                    $scope.context.globalAlpha  = 1;
                    $scope.context.fillStyle='rgb(255,255,255)';
                    $scope.context.fillRect(sel.x-5,sel.y-5,10,10);
                    $scope.context.strokeRect(sel.x-5,sel.y-5,10,10);
                    $scope.context.fillRect(sel.x-5+sel.w,sel.y-5,10,10);
                    $scope.context.strokeRect(sel.x-5+sel.w,sel.y-5,10,10);
                    $scope.context.fillRect(sel.x-5+sel.w,sel.y-5+sel.h,10,10);
                    $scope.context.strokeRect(sel.x-5+sel.w,sel.y-5+sel.h,10,10);
                    $scope.context.fillRect(sel.x-5,sel.y-5+sel.h,10,10);
                    $scope.context.strokeRect(sel.x-5,sel.y-5+sel.h,10,10);
                }

                function mouseDown(evt){
                    var mousePos = getMousePos($scope.canvas,evt);
                    var lt = {x:sel.x,y:sel.y};
                    var rt = {x:sel.x+sel.w,y:sel.y};
                    var lb = {x:sel.x,y:sel.y+sel.h};
                    var rb = {x:sel.x+sel.w,y:sel.y+sel.h};

                    //what type the operation is
                    if(isNear(mousePos,lt)){
                        moveType = 'leftTop';
                    }else if(isNear(mousePos,rt)) moveType = 'rightTop';
                    else if(isNear(mousePos,lb)) moveType = 'leftBottom';
                    else if(isNear(mousePos,rb)) moveType = 'rightBottom';
                    else if(mousePos.x > lt.x && mousePos.y > lt.y && mousePos.x < rb.x && mousePos.y < rb.y) {
                        moveType = 'moving';
                        delX = mousePos.x - lt.x;
                        delY = mousePos.y - lt.y;

                    }
                    else moveType = 'notMoving';

                }


                function mouseMove(evt){
                    var mousePos = getMousePos($scope.canvas,evt);
                    var lt = {x:sel.x,y:sel.y};
                    var rt = {x:sel.x+sel.w,y:sel.y};
                    var lb = {x:sel.x,y:sel.y+sel.h};
                    var rb = {x:sel.x+sel.w,y:sel.y+sel.h};

                    if( moveType == 'moving'){
                        if(mousePos.x-delX >= 0 && mousePos.x-delX+sel.w <= $scope.canvas.width && mousePos.y-delY >= 0 && mousePos.y-delY+sel.h <= $scope.canvas.height) {
                            sel.x = mousePos.x - delX;
                            sel.y = mousePos.y - delY;
                            $scope.canvasClass = "dragging";
                        }
                        else {
                            if(mousePos.x-delX < 0) sel.x = 0;
                            else if(mousePos.x-delX+sel.w > $scope.canvas.width) sel.x = $scope.canvas.width - sel.w;
                            else sel.x = mousePos.x - delX;
                            if(mousePos.y-delY < 0) sel.y = 0;
                            else if(mousePos.y-delY+sel.h > $scope.canvas.height) sel.y = $scope.canvas.height - sel.h;
                            else sel.y = mousePos.y - delY;
                        }
                    }
                    else if(moveType == 'leftTop'){
                        if(!$scope.square){
                            sel.x = (mousePos.x > rt.x - 50)? rt.x - 50:mousePos.x;
                            sel.w = (mousePos.x > rt.x - 50)? 50 : rt.x - mousePos.x ;
                            sel.y = (mousePos.y > rb.y - 50)? rb.y - 50:mousePos.y;
                            sel.h = (mousePos.y > rb.y - 50)? 50: rb.y - mousePos.y ;
                        }else{
                            if(sel.y>=0) {
                                sel.x = (mousePos.x > rt.x - 50) ? rt.x - 50 : mousePos.x;
                                sel.w = (mousePos.x > rt.x - 50) ? 50 : rt.x - mousePos.x;
                                sel.y = rb.y - sel.w;
                                sel.h = sel.w;
                            }
                        }
                    }
                    else if(moveType == 'rightTop'){
                        if(!$scope.square){

                            sel.w = (mousePos.x < lt.x + 50)? 50 : mousePos.x - lt.x;
                            sel.y = (mousePos.y > rb.y - 50)? rb.y - 50:mousePos.y;
                            sel.h = (mousePos.y > rb.y - 50)? 50: rb.y - mousePos.y ;
                        }else{
                            if(sel.y>=0) {
                                sel.w = (mousePos.x < lt.x + 50)? 50 : mousePos.x - lt.x;
                                sel.y = rb.y - sel.w;
                                sel.h = sel.w;
                            }
                        }
                    }
                    else if(moveType == 'leftBottom'){
                        if(!$scope.square){
                            sel.x = (mousePos.x > rt.x - 50)? rt.x - 50:mousePos.x;
                            sel.w = (mousePos.x > rt.x - 50)? 50 : rt.x - mousePos.x ;
                            sel.h = (mousePos.y < rt.y + 50)? 50:  mousePos.y-rt.y ;
                        }else{
                            if(sel.x>=0) {
                                sel.x = rt.x - sel.h;
                                sel.w = sel.h;
                                sel.h = (mousePos.y < rt.y + 50)? 50:  mousePos.y-rt.y ;
                            }
                        }
                    }
                    else if(moveType == 'rightBottom'){
                        if(!$scope.square){
                            sel.w = (mousePos.x < lt.x + 50)? 50 : mousePos.x - lt.x;
                            sel.h = (mousePos.y < lt.y + 50)? 50:  mousePos.y - lt.y ;
                        }else{
                            if(sel.y>=0) {
                                sel.w = (mousePos.x < lt.x + 50)? 50 : mousePos.x - lt.x;
                                sel.h = sel.w;
                            }
                        }
                    }
                    drawSel();
                }


                function mouseUp(){
                    moveType = 'notMoving';
                    $scope.canvasClass = "";
                    outPutImg();
                }

                function outPutImg(){
                    var m_canvas = document.createElement('canvas');

                        console.log('Crop');
                        var m_height = sel.h * c2IRatio;
                        var m_width = sel.w * c2IRatio;
                        var r = m_width/m_height;
                        m_canvas.height = m_height;
                        m_canvas.width = m_width;
                        var maxHeight,maxWidth;
                        if( typeof $scope.maxWidth === 'undefined'){
                            maxWidth = tempImg.width;
                        }
                        else {
                            maxWidth = $scope.maxWidth;
                        }
                        if( typeof $scope.maxHeight === 'undefined'){
                            maxHeight = tempImg.height;
                        }
                        else {
                            maxHeight = $scope.maxHeight;
                        }

                        if (r > maxWidth / maxHeight && m_width > maxWidth) {
                            m_canvas.width = maxWidth;
                            m_canvas.height = maxWidth / r;
                        }
                        else if (r <= maxWidth / maxHeight && m_height > maxHeight) {
                            m_canvas.width = maxHeight * r;
                            m_canvas.height = maxHeight;
                        }
                        else {
                            m_canvas.height = m_height;
                            m_canvas.width = m_width;
                        }
                        var m_context = m_canvas.getContext('2d');
                        m_context.drawImage(tempImg, sel.x * c2IRatio, sel.y * c2IRatio, Math.min(sel.w * c2IRatio, tempImg.width), Math.min(sel.h * c2IRatio, tempImg.height), 0, 0, m_canvas.width, m_canvas.height);
                        $scope.$apply(function () {
                            $scope.resultData = m_canvas.toDataURL();
                        });

                }

                function getMousePos(canvas, evt) {
                    var rect = canvas.getBoundingClientRect();
                    return {
                        x: evt.clientX - rect.left,
                        y: evt.clientY - rect.top
                    };
                }

                function isNear(pos1,pos2){
                    var tol = 5;
                    return Math.abs(pos1.x - pos2.x) < tol && Math.abs(pos1.y - pos2.y) < tol;
                }

                function keyDown(event){
                    if(event.keyCode == 16){
                        $scope.square = true;
                    }
                }

                function keyUp(event){
                    if(event.keyCode == 16){
                        $scope.square = false;
                    }
                }

            }
        }
    });