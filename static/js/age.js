function showAge(){
    document.getElementById("age").innerHTML= calcAge();
    setTimeout(showAge, 1000);
}
function calcAge(){
    var date= new Date();
    var fullYear= date.getFullYear();
    var seconds= Math.floor((date.getTime()-new Date(1987, 9, 6, 0, 0, 0).getTime())/1000);
    var days= Math.floor(seconds/(60*60*24));
    var leaps=0;
    for(i=1987; i<fullYear; i++)
        if (((i%4 === 0) && (i%100 !== 0)) || (i%400 === 0))
            leaps= leaps+1;
    days= days-leaps;
    var years= Math.floor(days/365);
    days= days + leaps - ((years-leaps)*365 + leaps*366);
    if (days<0) days=0;
    seconds= date.getSeconds() + date.getMinutes()*60 + date.getHours()*24*60;
    return years + " years, " + days + " day(s) and " + seconds + " second(s)";
}     